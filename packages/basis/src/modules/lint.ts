import { execSync } from "node:child_process";
import { consola } from "consola";
import fg from "fast-glob";
import micromatch from "micromatch";
import { detectPackageManager } from "nypm";
import { resolve } from "pathe";
import { readPackageJSON } from "pkg-types";
import type { LintConfig } from "../types";
import { fileExists, getPackageManagerCommands, loadConfig } from "../utils";

/**
 * Get staged files (only existing files, not deleted ones)
 */
export function getStagedFiles(): string[] {
  try {
    // Get all staged files including deleted ones
    const output = execSync("git diff --cached --name-only", {
      encoding: "utf8",
    });
    const allStagedFiles = output.trim().split("\n").filter(Boolean);

    // Get only deleted files
    const deletedOutput = execSync(
      "git diff --cached --name-only --diff-filter=D",
      {
        encoding: "utf8",
      },
    );
    const deletedFiles = new Set(
      deletedOutput.trim().split("\n").filter(Boolean),
    );

    // Return only files that are not deleted
    return allStagedFiles.filter((file) => !deletedFiles.has(file));
  } catch {
    return [];
  }
}

/**
 * Get all project files based on patterns using fast-glob
 */
export async function getProjectFiles(
  cwd: string,
  patterns: string[] = ["**/*"],
  exclude: string[] = ["node_modules/**", "dist/**", "build/**", ".git/**"],
): Promise<string[]> {
  try {
    return await fg(patterns, {
      cwd,
      ignore: exclude,
      onlyFiles: true,
      dot: false,
      absolute: false,
    });
  } catch (error) {
    consola.warn("Failed to scan project files:", error);
    return [];
  }
}

/**
 * Lint staged files
 */
export async function lintStaged(
  cwd = process.cwd(),
  config?: LintConfig["staged"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { staged: config } } : undefined,
  });
  const stagedConfig = loadedConfig.lint?.staged || {};

  const files = getStagedFiles();

  if (files.length === 0) {
    consola.info("No staged files to lint");
    return true;
  }

  if (Object.keys(stagedConfig).length === 0) {
    consola.warn("No staged lint configuration found");
    return true;
  }

  let hasErrors = false;
  const processedFiles = new Set<string>();

  for (const [pattern, command] of Object.entries(stagedConfig)) {
    const matchedFiles = files.filter(
      (file) =>
        !processedFiles.has(file) &&
        micromatch.isMatch(file.split("/").pop() || file, pattern),
    );

    if (matchedFiles.length === 0) continue;

    consola.start(`Linting ${matchedFiles.length} files: ${pattern}`);

    try {
      const fullCommand = `${command} ${matchedFiles.join(" ")}`;
      execSync(fullCommand, {
        stdio: "inherit",
        cwd: cwd,
      });

      // Re-stage the linted files after potential modifications (only existing files)
      const existingFiles = [];
      for (const file of matchedFiles) {
        if (await fileExists(resolve(cwd, file))) {
          existingFiles.push(file);
        }
      }

      if (existingFiles.length > 0) {
        execSync(`git add ${existingFiles.join(" ")}`, {
          stdio: "inherit",
          cwd: cwd,
        });
      }

      matchedFiles.forEach((file) => processedFiles.add(file));
      consola.success(`${pattern}`);
    } catch (error) {
      hasErrors = true;
      consola.error(`${pattern} failed:`, error);
    }
  }

  return !hasErrors;
}

/**
 * Lint entire project using commands (similar to staged but for all project files)
 */
export async function lintProject(
  cwd = process.cwd(),
  config?: LintConfig["project"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { project: config } } : undefined,
  });
  const projectConfig = loadedConfig.lint?.project || {};

  if (Object.keys(projectConfig).length === 0) {
    consola.warn("No project lint configuration found");
    return true;
  }

  consola.start("Running project-wide linting...");

  let hasErrors = false;

  for (const [pattern, command] of Object.entries(projectConfig)) {
    consola.start(`Running project lint: ${pattern}`);

    try {
      // For project-wide linting, we run the command as-is
      // The command should handle file discovery itself
      execSync(command, {
        stdio: "inherit",
        cwd: cwd,
      });

      consola.success(`${pattern}`);
    } catch (error) {
      hasErrors = true;
      consola.error(`${pattern} failed:`, error);
    }
  }

  return !hasErrors;
}

/**
 * Check dependencies
 */
export async function lintDependencies(
  cwd = process.cwd(),
  config?: LintConfig["dependencies"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { dependencies: config } } : undefined,
  });
  const depsConfig = loadedConfig.lint?.dependencies || {};

  let hasIssues = false;

  try {
    const packageJson = await readPackageJSON(cwd);
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Detect package manager once
    const detected = await detectPackageManager(cwd);
    const packageManager = detected?.name || "npm";
    const commands = getPackageManagerCommands(packageManager);

    consola.start("Checking dependencies...");

    // Check for blocked packages
    if (depsConfig.blockedPackages && depsConfig.blockedPackages.length > 0) {
      const blockedFound = Object.keys(allDeps).filter((dep) =>
        depsConfig.blockedPackages?.includes(dep),
      );

      if (blockedFound.length > 0) {
        consola.error(`Blocked packages found: ${blockedFound.join(", ")}`);
        hasIssues = true;
      } else {
        consola.success("No blocked packages found");
      }
    }

    // Check outdated dependencies
    if (depsConfig.checkOutdated) {
      try {
        execSync(commands.outdated, { cwd, stdio: "pipe" });
        consola.success("All dependencies are up to date");
      } catch (error) {
        consola.warn("⚠ Some dependencies are outdated:", error);
        // Don't mark as error since outdated deps are warnings
      }
    }

    // Check for security vulnerabilities
    if (depsConfig.checkSecurity) {
      try {
        execSync(commands.audit, { cwd, stdio: "pipe" });
        consola.success("No security vulnerabilities found");
      } catch (error) {
        consola.error("Security vulnerabilities detected:", error);
        hasIssues = true;
      }
    }

    // Check allowed licenses
    if (depsConfig.allowedLicenses && depsConfig.allowedLicenses.length > 0) {
      consola.info(
        "📝 License checking requires manual review or additional tooling",
      );
      // License checking would require parsing node_modules or using tools like license-checker
    }
  } catch (error) {
    consola.error("Failed to check dependencies:", error);
    hasIssues = true;
  }

  return !hasIssues;
}

/**
 * Check project structure
 */
export async function lintStructure(
  cwd = process.cwd(),
  config?: LintConfig["structure"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { structure: config } } : undefined,
  });
  const structureConfig = loadedConfig.lint?.structure || {};

  let hasIssues = false;

  consola.start("Checking project structure...");

  // Check required files
  if (structureConfig.requiredFiles) {
    for (const file of structureConfig.requiredFiles) {
      const filePath = resolve(cwd, file);
      if (!(await fileExists(filePath))) {
        consola.error(`Required file missing: ${file}`);
        hasIssues = true;
      } else {
        consola.success(`Required file found: ${file}`);
      }
    }
  }

  // Check required directories
  if (structureConfig.requiredDirs) {
    for (const dir of structureConfig.requiredDirs) {
      const dirPath = resolve(cwd, dir);
      if (!(await fileExists(dirPath))) {
        consola.error(`Required directory missing: ${dir}`);
        hasIssues = true;
      } else {
        consola.success(`Required directory found: ${dir}`);
      }
    }
  }

  // Check naming conventions for different paths
  if (structureConfig.naming && structureConfig.naming.length > 0) {
    for (const namingRule of structureConfig.naming) {
      const {
        path: pathPattern,
        files: filePattern,
        directories: dirPattern,
        description,
      } = namingRule;

      consola.start(`Checking naming rule: ${description || pathPattern}`);

      // Get files matching the path pattern
      const matchingFiles = await getProjectFiles(cwd, [pathPattern]);

      if (filePattern) {
        const fileRegex = new RegExp(filePattern);
        const invalidFiles = matchingFiles.filter((file) => {
          const fileName = file.split("/").pop() || "";
          return !fileRegex.test(fileName);
        });

        if (invalidFiles.length > 0) {
          consola.error(
            `Files with invalid naming in ${pathPattern}: ${invalidFiles.slice(0, 3).join(", ")}${invalidFiles.length > 3 ? "..." : ""}`,
          );
          hasIssues = true;
        } else if (matchingFiles.length > 0) {
          consola.success(
            `All files in ${pathPattern} follow naming convention`,
          );
        }
      }

      if (dirPattern) {
        // Check directory naming for paths that contain directories
        const dirRegex = new RegExp(dirPattern);
        const dirs = new Set<string>();

        matchingFiles.forEach((file) => {
          const pathParts = file.split("/");
          pathParts.pop(); // Remove filename
          pathParts.forEach((part) => dirs.add(part));
        });

        const invalidDirs = Array.from(dirs).filter(
          (dir) => !dirRegex.test(dir),
        );

        if (invalidDirs.length > 0) {
          consola.error(
            `Directories with invalid naming in ${pathPattern}: ${invalidDirs.slice(0, 3).join(", ")}`,
          );
          hasIssues = true;
        } else if (dirs.size > 0) {
          consola.success(
            `All directories in ${pathPattern} follow naming convention`,
          );
        }
      }
    }
  }

  return !hasIssues;
}

/**
 * Check documentation
 */
export async function lintDocs(
  cwd = process.cwd(),
  config?: LintConfig["docs"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { docs: config } } : undefined,
  });
  const docsConfig = loadedConfig.lint?.docs || {};

  let hasIssues = false;

  consola.start("Checking documentation...");

  // Check README
  if (docsConfig.checkReadme !== false) {
    const readmeFiles = ["README.md", "README.rst", "README.txt", "readme.md"];
    const hasReadme = await Promise.all(
      readmeFiles.map((file) => fileExists(resolve(cwd, file))),
    );

    if (!hasReadme.some((exists) => exists)) {
      consola.error("No README file found");
      hasIssues = true;
    } else {
      consola.success("README file found");
    }
  }

  // Check CHANGELOG
  if (docsConfig.checkChangelog) {
    const changelogFiles = [
      "CHANGELOG.md",
      "CHANGELOG.rst",
      "HISTORY.md",
      "changelog.md",
    ];
    const hasChangelog = await Promise.all(
      changelogFiles.map((file) => fileExists(resolve(cwd, file))),
    );

    if (!hasChangelog.some((exists) => exists)) {
      consola.error("No CHANGELOG file found");
      hasIssues = true;
    } else {
      consola.success("CHANGELOG file found");
    }
  }

  return !hasIssues;
}

/**
 * Run all lint checks
 */
export async function lintAll(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig({ cwd });
  const lintConfig = config.lint || {};

  consola.start("Running comprehensive project lint...");

  const results = await Promise.allSettled([
    lintProject(cwd, lintConfig.project),
    lintDependencies(cwd, lintConfig.dependencies),
    lintStructure(cwd, lintConfig.structure),
    lintDocs(cwd, lintConfig.docs),
  ]);

  const failures = results.filter(
    (result) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" && !result.value),
  );

  if (failures.length === 0) {
    consola.success("All lint checks passed!");
    return true;
  }
  consola.error(`${failures.length} lint check(s) failed`);
  return false;
}
