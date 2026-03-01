import { writeFile } from "node:fs/promises";
import { exec } from "dugite";
import { loadConfig } from "c12";
import { consola } from "consola";
import { detectPackageManager } from "nypm";
import type { InitOptions } from "../types";

/**
 * Initialize basis configuration
 */
export async function initProject(
  cwd = process.cwd(),
  options: InitOptions = {},
): Promise<boolean> {
  const { force = false, skipGitCheck = false } = options;

  consola.start("Initializing basis configuration");

  // Check if config already exists using c12
  const result = await loadConfig({
    cwd,
    name: "basis",
  });

  const configFile = result._configFile;

  if (configFile && !force) {
    consola.error(`Configuration file already exists: ${configFile}`);
    consola.info("Use --force to overwrite.");
    return false;
  }

  // Detect package manager for hooks generation
  const detected = await detectPackageManager(cwd);
  const packageManager = detected?.name || "npm";
  const prefix = packageManager === "npm" ? "npx" : packageManager;

  // Create config content
  const configObject = {
    git: {
      hooks: {
        "pre-commit": `${prefix} basis git staged`,
        "commit-msg": `${prefix} basis git lint-commit`,
      },
      staged: {
        rules: {
          "*.{ts,tsx,js,jsx}": "basis lint --fix",
          "*.{json,md,yml,yaml}": "basis fmt --write",
        },
      },
    },
  };

  const configContent = `import { defineBasisConfig } from "@funish/basis/config";

export default defineBasisConfig(${JSON.stringify(configObject, null, 2)});
`;

  // Write config file (always .ts format)
  const configFilePath = `${cwd}/basis.config.ts`;
  await writeFile(configFilePath, configContent, "utf8");
  consola.success(`Configuration created in ${configFilePath}`);

  // Setup Git if available
  if (!skipGitCheck) {
    try {
      await exec(["--version"], cwd);
      consola.info("Git detected");
    } catch {
      consola.info("Git not found");
    }
  }

  consola.success("Basis initialization completed!");
  consola.info("Run 'basis git setup' to setup Git hooks");

  return true;
}
