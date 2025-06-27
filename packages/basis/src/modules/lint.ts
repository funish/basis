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
    return true;
  }

  if (Object.keys(stagedConfig).length === 0) {
    consola.warn(
      "No staged lint configuration found. Add lint.staged section to your basis.config.ts",
    );
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
    } catch (error) {
      hasErrors = true;
      consola.error(
        `Lint pattern '${pattern}' failed. Please fix the issues and try again:`,
        error,
      );
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
    consola.warn(
      "No project lint configuration found. Add lint.project section to your basis.config.ts",
    );
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
    } catch (error) {
      hasErrors = true;
      consola.error(
        `Project lint pattern '${pattern}' failed. Please fix the issues and try again:`,
        error,
      );
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
        consola.error(
          `Blocked packages found: ${blockedFound.join(", ")}. Please remove these packages from your dependencies.`,
        );
        hasIssues = true;
      }
    }

    // Check outdated dependencies
    if (depsConfig.checkOutdated) {
      if (commands.outdated) {
        try {
          execSync(commands.outdated, { cwd, stdio: "pipe" });
        } catch (error) {
          consola.warn("Some dependencies are outdated:", error);
          // Don't mark as error since outdated deps are warnings
        }
      } else {
        consola.warn(`Outdated check not available for ${packageManager}`);
      }
    }

    // Check for security vulnerabilities
    if (depsConfig.checkSecurity) {
      if (commands.audit) {
        try {
          execSync(commands.audit, { cwd, stdio: "pipe" });
        } catch (error) {
          consola.error("Security vulnerabilities detected:", error);
          hasIssues = true;
        }
      } else {
        consola.warn(`Security audit not available for ${packageManager}`);
      }
    }

    // Check allowed licenses
    if (depsConfig.allowedLicenses && depsConfig.allowedLicenses.length > 0) {
      const { hasIssues: licenseIssues, invalidLicenses } =
        await checkPackageLicenses(cwd, depsConfig.allowedLicenses);

      if (licenseIssues) {
        consola.error("Packages with invalid licenses found:");
        invalidLicenses.forEach((license) => consola.error(`  ${license}`));
        hasIssues = true;
      }
    }
  } catch (error) {
    consola.error("Failed to check dependencies:", error);
    hasIssues = true;
  }

  return !hasIssues;
}

/**
 * Check required files exist
 */
async function checkRequiredFiles(
  cwd: string,
  requiredFiles: string[],
): Promise<boolean> {
  if (requiredFiles.length === 0) return true;

  // Batch check all required files
  const fileChecks = await Promise.all(
    requiredFiles.map(async (file) => ({
      file,
      exists: await fileExists(resolve(cwd, file)),
    })),
  );

  const missingFiles = fileChecks.filter((check) => !check.exists);

  if (missingFiles.length > 0) {
    missingFiles.forEach(({ file }) => {
      consola.error(`Required file missing: ${file}`);
    });
    return false;
  }

  return true;
}

/**
 * Check required directories exist
 */
async function checkRequiredDirectories(
  cwd: string,
  requiredDirs: string[],
): Promise<boolean> {
  if (requiredDirs.length === 0) return true;

  // Batch check all required directories
  const dirChecks = await Promise.all(
    requiredDirs.map(async (dir) => ({
      dir,
      exists: await fileExists(resolve(cwd, dir)),
    })),
  );

  const missingDirs = dirChecks.filter((check) => !check.exists);

  if (missingDirs.length > 0) {
    missingDirs.forEach(({ dir }) => {
      consola.error(`Required directory missing: ${dir}`);
    });
    return false;
  }

  return true;
}

/**
 * Check file naming conventions
 */
async function checkFileNaming(
  cwd: string,
  pathPattern: string,
  filePattern: string,
): Promise<boolean> {
  const fileRegex = new RegExp(filePattern);
  const matchingFiles = await getProjectFiles(cwd, [pathPattern]);

  const invalidFiles = matchingFiles.filter((file) => {
    const fileName = file.split("/").pop() || "";
    return !fileRegex.test(fileName);
  });

  if (invalidFiles.length > 0) {
    consola.error(
      `Files with invalid naming in ${pathPattern}: ${invalidFiles.slice(0, 3).join(", ")}${invalidFiles.length > 3 ? "..." : ""}`,
    );
    return false;
  }

  return true;
}

/**
 * Check directory naming conventions
 */
async function checkDirectoryNaming(
  cwd: string,
  pathPattern: string,
  dirPattern: string,
): Promise<boolean> {
  const dirRegex = new RegExp(dirPattern);
  const dirs = new Set<string>();

  // Get all directories that match the path pattern
  const allDirs = await getProjectFiles(cwd, [
    pathPattern.replace(/\/\*\*?$/, ""),
  ]);

  const directoryPaths = allDirs.filter(async (path) => {
    const fullPath = resolve(cwd, path);
    try {
      const stats = await import("node:fs/promises").then((fs) =>
        fs.stat(fullPath),
      );
      return stats.isDirectory();
    } catch {
      return false;
    }
  });

  // Check each directory name against the pattern
  for (const dirPath of await Promise.all(directoryPaths)) {
    if (dirPath) {
      const dirName = dirPath.split("/").pop() || "";
      if (!dirRegex.test(dirName)) {
        dirs.add(dirPath);
      }
    }
  }

  if (dirs.size > 0) {
    consola.error(
      `Directories with invalid naming in ${pathPattern}: ${Array.from(dirs).slice(0, 3).join(", ")}`,
    );
    return false;
  }

  return true;
}

/**
 * Check naming conventions for files and directories
 */
async function checkNamingConventions(
  cwd: string,
  namingRules: Array<{
    path: string;
    files?: string;
    directories?: string;
    description?: string;
  }>,
): Promise<boolean> {
  let hasIssues = false;

  for (const namingRule of namingRules) {
    const {
      path: pathPattern,
      files: filePattern,
      directories: dirPattern,
      description,
    } = namingRule;

    consola.start(`Checking naming rule: ${description || pathPattern}`);

    if (filePattern) {
      const fileCheck = await checkFileNaming(cwd, pathPattern, filePattern);
      if (!fileCheck) hasIssues = true;
    }

    if (dirPattern) {
      const dirCheck = await checkDirectoryNaming(cwd, pathPattern, dirPattern);
      if (!dirCheck) hasIssues = true;
    }
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
    const filesCheck = await checkRequiredFiles(
      cwd,
      structureConfig.requiredFiles,
    );
    if (!filesCheck) hasIssues = true;
  }

  // Check required directories
  if (structureConfig.requiredDirs) {
    const dirsCheck = await checkRequiredDirectories(
      cwd,
      structureConfig.requiredDirs,
    );
    if (!dirsCheck) hasIssues = true;
  }

  // Check naming conventions
  if (structureConfig.naming && structureConfig.naming.length > 0) {
    const namingCheck = await checkNamingConventions(
      cwd,
      structureConfig.naming,
    );
    if (!namingCheck) hasIssues = true;
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

  // Batch check all documentation files
  const docFilesToCheck: Array<{
    type: string;
    files: string[];
    required: boolean;
  }> = [];

  if (docsConfig.checkReadme !== false) {
    docFilesToCheck.push({
      type: "README",
      files: ["README.md", "README.rst", "README.txt", "readme.md"],
      required: true,
    });
  }

  if (docsConfig.checkChangelog) {
    docFilesToCheck.push({
      type: "CHANGELOG",
      files: ["CHANGELOG.md", "CHANGELOG.rst", "HISTORY.md", "changelog.md"],
      required: true,
    });
  }

  // Perform all file checks in parallel
  for (const { type, files, required } of docFilesToCheck) {
    const fileExistenceChecks = await Promise.all(
      files.map((file) => fileExists(resolve(cwd, file))),
    );

    const hasAnyFile = fileExistenceChecks.some((exists) => exists);

    if (required && !hasAnyFile) {
      consola.error(`No ${type} file found`);
      hasIssues = true;
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
    return true;
  }
  consola.error(`${failures.length} lint check(s) failed`);
  return false;
}

/**
 * Check package licenses using license-checker approach
 */
async function checkPackageLicenses(
  cwd: string,
  allowedLicenses: string[],
): Promise<{ hasIssues: boolean; invalidLicenses: string[] }> {
  try {
    // Try to get license info from package.json files in node_modules
    const packageJsonFiles = await fg(
      ["node_modules/*/package.json", "node_modules/@*/*/package.json"],
      {
        cwd,
        onlyFiles: true,
        absolute: true,
      },
    );

    const invalidLicenses: string[] = [];
    const checkedPackages = new Set<string>();

    for (const pkgPath of packageJsonFiles) {
      try {
        const pkg = await readPackageJSON(pkgPath);
        if (!pkg.name || checkedPackages.has(pkg.name)) continue;

        checkedPackages.add(pkg.name);

        if (pkg.license) {
          const license = Array.isArray(pkg.license)
            ? pkg.license.join(", ")
            : pkg.license;
          if (!allowedLicenses.some((allowed) => license.includes(allowed))) {
            invalidLicenses.push(`${pkg.name}: ${license}`);
          }
        }
      } catch {
        // Skip invalid package.json files
      }
    }

    return {
      hasIssues: invalidLicenses.length > 0,
      invalidLicenses,
    };
  } catch (error) {
    consola.warn("Failed to check licenses:", error);
    return { hasIssues: false, invalidLicenses: [] };
  }
}
