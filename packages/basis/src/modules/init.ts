import { existsSync, writeFileSync } from "node:fs";
import { consola } from "consola";
import {
  addDevDependency,
  detectPackageManager,
  installDependencies,
} from "nypm";
import { resolve } from "pathe";
import { readPackageJSON, writePackageJSON } from "pkg-types";
import type { InitOptions } from "../types";

const CONFIG_TEMPLATE = `import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  lint: {
    staged: {
    },
    commitMsg: {
      // types: ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
      // maxLength: 72,
      // minLength: 10,
    },
  },

  hooks: {
    // "pre-commit": "basis lint --staged",
    // "commit-msg": "basis lint --commit-msg",
  },
});
`;

/**
 * Initialize basis configuration in the current project
 */
export async function init(cwd = process.cwd(), options: InitOptions = {}) {
  const { force = false, skipGitCheck = false, skipInstall = false } = options;

  consola.start("Initializing basis configuration...");

  // Check if config already exists
  const configPath = resolve(cwd, "basis.config.ts");
  if (existsSync(configPath) && !force) {
    consola.error("basis.config.ts already exists. Use --force to overwrite.");
    return false;
  }

  // Check if .git directory exists
  if (!skipGitCheck && !existsSync(resolve(cwd, ".git"))) {
    consola.warn("No .git directory found. Git hooks will not work properly.");
    const shouldContinue = await consola.prompt("Continue anyway?", {
      type: "confirm",
      initial: false,
    });
    if (!shouldContinue) {
      consola.info("Initialization cancelled.");
      return false;
    }
  }

  // Detect package manager
  const detected = await detectPackageManager(cwd);
  const packageManager = detected?.name || "npm";
  consola.info(`Detected package manager: ${packageManager}`);

  // Create config file
  writeFileSync(configPath, CONFIG_TEMPLATE, "utf-8");
  consola.success("Created basis.config.ts");

  try {
    // Update package.json scripts and dependencies
    const pkg = await readPackageJSON(cwd);

    // Check if we're in a workspace root
    const isWorkspaceRoot = !!(
      pkg.workspaces || existsSync(resolve(cwd, "pnpm-workspace.yaml"))
    );

    if (!skipInstall) {
      // Add basis to devDependencies using nypm when not skipping install
      await addDevDependency("@funish/basis", {
        cwd,
        silent: false,
        workspace: isWorkspaceRoot,
      });
      consola.success("Added @funish/basis to devDependencies");
    } else {
      // Manually add to package.json when skipping install
      if (
        !pkg.devDependencies?.["@funish/basis"] &&
        !pkg.dependencies?.["@funish/basis"]
      ) {
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies["@funish/basis"] = "latest";
        consola.info("Added @funish/basis to devDependencies");
      }
    }

    // Add scripts based on package manager
    const hookInstallCommand = "basis hooks install";
    pkg.scripts = pkg.scripts || {};

    // Handle different package managers' lifecycle scripts
    if (packageManager === "pnpm") {
      // pnpm runs postinstall for root and each workspace package
      if (!pkg.scripts.postinstall) {
        pkg.scripts.postinstall = hookInstallCommand;
      } else if (!pkg.scripts.postinstall.includes(hookInstallCommand)) {
        pkg.scripts.postinstall = `${pkg.scripts.postinstall} && ${hookInstallCommand}`;
      }
    } else if (packageManager === "yarn") {
      // yarn has different behavior in v1 vs v2+, use prepare instead
      if (!pkg.scripts.prepare) {
        pkg.scripts.prepare = hookInstallCommand;
      } else if (!pkg.scripts.prepare.includes(hookInstallCommand)) {
        pkg.scripts.prepare = `${pkg.scripts.prepare} && ${hookInstallCommand}`;
      }
    } else {
      // npm and others use postinstall
      if (!pkg.scripts.postinstall) {
        pkg.scripts.postinstall = hookInstallCommand;
      } else if (!pkg.scripts.postinstall.includes(hookInstallCommand)) {
        pkg.scripts.postinstall = `${pkg.scripts.postinstall} && ${hookInstallCommand}`;
      }
    }

    // Always write package.json to update scripts (and dependencies if skipping install)
    await writePackageJSON(resolve(cwd, "package.json"), pkg);
    consola.success(
      `Updated package.json scripts${skipInstall ? " and dependencies" : ""}`,
    );

    // Install dependencies using nypm if not skipped
    if (!skipInstall) {
      consola.start("Installing dependencies...");
      await installDependencies({
        cwd,
        silent: false,
      });
      consola.success("Dependencies installed successfully");
    } else {
      consola.info("Skipped dependency installation");
      consola.info(
        "Run your package manager's install command to complete setup",
      );
    }
  } catch (error) {
    consola.error("Failed to setup dependencies:", error);
    return false;
  }

  consola.success("Basis initialization completed!");
  consola.info("You can now:");
  consola.info("  - Edit basis.config.ts to customize your configuration");
  consola.info("  - Run `basis hooks install` to install git hooks");

  return true;
}
