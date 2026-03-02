import { stat } from "node:fs/promises";
import { execSync } from "node:child_process";
import { consola } from "consola";
import { detectPackageManager } from "nypm";
import { glob } from "tinyglobby";
import { readPackageJSON, resolvePackageJSON } from "pkg-types";
import { resolve } from "pathe";
import type { AuditConfig } from "../types";
import { loadConfig } from "../config";

/**
 * Package manager command configurations
 */
const PACKAGE_MANAGER_COMMANDS: Record<
  string,
  {
    outdated: string[] | null;
    audit: string[] | null;
  }
> = {
  npm: {
    outdated: ["outdated"],
    audit: ["audit"],
  },
  yarn: {
    outdated: ["outdated", "-c"],
    audit: ["audit"],
  },
  pnpm: {
    outdated: ["outdated"],
    audit: ["audit"],
  },
  bun: {
    outdated: ["outdated"],
    audit: ["audit"],
  },
  deno: {
    outdated: null,
    audit: null,
  },
};

/**
 * Audit dependencies
 */
export async function auditDependencies(
  cwd = process.cwd(),
  config?: AuditConfig["dependencies"],
  _fix = false,
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    overrides: config ? { audit: { dependencies: config } } : undefined,
  });
  const depsConfig = loadedConfig.audit?.dependencies || {};

  consola.start("Auditing dependencies...");

  let hasIssues = false;

  // Check for blocked packages
  if (depsConfig.blocked && depsConfig.blocked.length > 0) {
    try {
      const packageJson = await readPackageJSON(cwd);
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const foundBlocked = Object.keys(allDeps).filter((dep) => depsConfig.blocked?.includes(dep));

      if (foundBlocked.length > 0) {
        consola.error(
          `Found ${foundBlocked.length} blocked package(s): ${foundBlocked.join(", ")}`,
        );
        hasIssues = true;
      }
    } catch (error) {
      consola.error("Failed to check blocked packages:", error);
      hasIssues = true;
    }
  }

  // Check for outdated dependencies
  if (depsConfig.outdated) {
    try {
      const detected = await detectPackageManager(cwd);
      const packageManager = detected?.name || "npm";
      const commands = PACKAGE_MANAGER_COMMANDS[packageManager];

      if (!commands.outdated) {
        consola.info(`Skipping outdated check for ${packageManager}`);
      } else {
        try {
          execSync(`${packageManager} ${commands.outdated.join(" ")}`, { cwd, stdio: "inherit" });
        } catch {
          // outdated 命令会返回非0退出码表示有过期包
          consola.warn("Some dependencies are outdated");
        }
      }
    } catch (error) {
      consola.error("Failed to check outdated dependencies:", error);
      hasIssues = true;
    }
  }

  // Check for security vulnerabilities
  if (depsConfig.security) {
    try {
      const detected = await detectPackageManager(cwd);
      const packageManager = detected?.name || "npm";
      const commands = PACKAGE_MANAGER_COMMANDS[packageManager];

      if (!commands.audit) {
        consola.info(`Skipping security audit for ${packageManager}`);
      } else {
        try {
          execSync(`${packageManager} ${commands.audit.join(" ")}`, {
            cwd,
            stdio: "inherit",
          });
        } catch {
          // audit 命令会返回非0退出码表示有漏洞
          hasIssues = true;
        }
      }
    } catch (error) {
      consola.error("Failed to check security vulnerabilities:", error);
      hasIssues = true;
    }
  }

  // Check license compliance
  if (depsConfig.licenses && (depsConfig.licenses.allowed || depsConfig.licenses.blocked)) {
    try {
      const packageJsonPath = await resolvePackageJSON(cwd);

      // Find all node_modules package.json files
      const packageJsonFiles = await findNodeModulesPackages(cwd);

      const invalidLicenses: string[] = [];

      for (const pkgPath of packageJsonFiles) {
        try {
          const pkg = await readPackageJSON(pkgPath);
          if (!pkg.name || pkgPath === packageJsonPath) continue;

          if (pkg.license) {
            const license = Array.isArray(pkg.license) ? pkg.license.join(", ") : pkg.license;

            // Check blocked licenses
            if (
              depsConfig.licenses.blocked &&
              depsConfig.licenses.blocked.some((blocked) => license.includes(blocked))
            ) {
              invalidLicenses.push(`${pkg.name}: ${license}`);
              continue;
            }

            // Check allowed licenses
            if (depsConfig.licenses.allowed && depsConfig.licenses.allowed.length > 0) {
              const isAllowed = depsConfig.licenses.allowed.some((allowed) =>
                license.includes(allowed),
              );
              if (!isAllowed) {
                invalidLicenses.push(`${pkg.name}: ${license}`);
              }
            }
          }
        } catch {
          // Skip invalid package.json files
        }
      }

      if (invalidLicenses.length > 0) {
        consola.error("Packages with invalid licenses:");
        invalidLicenses.forEach((license) => consola.error(`  ${license}`));
        hasIssues = true;
      }
    } catch (error) {
      consola.error("Failed to check licenses:", error);
      hasIssues = true;
    }
  }

  if (!hasIssues) {
    consola.success("Dependencies audit passed");
  }

  return !hasIssues;
}

/**
 * Find all package.json files in node_modules
 */
export async function findNodeModulesPackages(cwd: string): Promise<string[]> {
  try {
    return await glob(
      [
        "node_modules/*/package.json",
        "node_modules/@*/*/package.json",
        "node_modules/@*/*/*/package.json",
      ],
      { cwd, absolute: true },
    );
  } catch {
    return [];
  }
}

/**
 * Audit project structure
 */
export async function auditStructure(
  cwd = process.cwd(),
  config?: AuditConfig["structure"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    overrides: config ? { audit: { structure: config } } : undefined,
  });
  const structConfig = loadedConfig.audit?.structure || {};

  consola.start("Auditing project structure...");

  let hasIssues = false;

  // Check required files/directories
  if (structConfig.required && structConfig.required.length > 0) {
    const missing: string[] = [];

    for (const pattern of structConfig.required) {
      try {
        // Try to stat the path
        await stat(resolve(cwd, pattern));
      } catch {
        // Check if it's a glob pattern or simple path
        if (pattern.includes("*") || pattern.includes("?")) {
          // For glob patterns, check if any file matches
          const matches = await glob([pattern], { cwd });
          if (matches.length === 0) {
            missing.push(pattern);
          }
        } else {
          missing.push(pattern);
        }
      }
    }

    if (missing.length > 0) {
      consola.error(`Missing required file(s)/director(ies): ${missing.join(", ")}`);
      hasIssues = true;
    }
  }

  // Check file naming conventions
  if (structConfig.files && structConfig.files.length > 0) {
    for (const rule of structConfig.files) {
      try {
        const matches = await glob([rule.pattern], { cwd });
        const regex = new RegExp(rule.rule);

        const invalidFiles = matches.filter((file) => !regex.test(file));

        if (invalidFiles.length > 0) {
          consola.error(
            `${rule.message}: ${invalidFiles.slice(0, 5).join(", ")}${invalidFiles.length > 5 ? "..." : ""}`,
          );
          hasIssues = true;
        }
      } catch (error) {
        consola.error(`Failed to check file naming rule: ${rule.pattern}`, error);
        hasIssues = true;
      }
    }
  }

  // Check directory naming conventions
  if (structConfig.dirs && structConfig.dirs.length > 0) {
    for (const rule of structConfig.dirs) {
      try {
        const matches = await glob([rule.pattern], { cwd });
        const regex = new RegExp(rule.rule);

        const invalidDirs = matches.filter((dir) => !regex.test(dir));

        if (invalidDirs.length > 0) {
          consola.error(
            `${rule.message}: ${invalidDirs.slice(0, 5).join(", ")}${invalidDirs.length > 5 ? "..." : ""}`,
          );
          hasIssues = true;
        }
      } catch (error) {
        consola.error(`Failed to check directory naming rule: ${rule.pattern}`, error);
        hasIssues = true;
      }
    }
  }

  if (!hasIssues) {
    consola.success("Structure audit passed");
  }

  return !hasIssues;
}

/**
 * Run all audits
 */
export async function auditAll(cwd = process.cwd(), fix = false): Promise<boolean> {
  const { config } = await loadConfig(); // Will automatically search upward
  const auditConfig = config.audit || {};

  consola.start("Running comprehensive project audit...");

  const results = await Promise.allSettled([
    auditDependencies(cwd, auditConfig.dependencies, fix),
    auditStructure(cwd, auditConfig.structure),
  ]);

  const failures = results.filter(
    (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value),
  );

  if (failures.length === 0) {
    consola.success("All audits passed");
    return true;
  }

  consola.error(`${failures.length} audit(s) failed`);
  return false;
}
