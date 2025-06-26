import { writeFile } from "node:fs/promises";
import { consola } from "consola";
import { builders, generateCode, parseModule } from "magicast";
import {
  addDevDependency,
  detectPackageManager,
  installDependencies,
} from "nypm";
import { resolve } from "pathe";
import { readPackageJSON, writePackageJSON } from "pkg-types";
import type { InitOptions } from "../types";
import { fileExists } from "../utils";

/**
 * Generate basis configuration using magicast
 */
function generateBasisConfig(): string {
  // Create base configuration structure using magicast
  const mod = parseModule("export default {}");

  // Create the configuration object
  const config = builders.functionCall("defineBasisConfig", [{}]);

  // Build minimal configuration - mostly empty to let users configure themselves
  const lintConfig = {
    staged: {},
    project: {},
  };

  // Build minimal git configuration
  const gitConfig = {
    hooks: {},
  };

  // Assign configuration to the function call argument
  const configArg = config.$args[0];
  configArg.lint = lintConfig;
  configArg.git = gitConfig;

  // Set the export
  mod.exports.default = config;

  // Add import statement
  mod.imports.$prepend({
    from: "@funish/basis",
    imported: "defineBasisConfig",
  });

  const { code } = generateCode(mod);
  return code;
}

/**
 * Generate configuration with user preferences
 */
function generateCustomBasisConfig(options: {
  enableStagedLinting?: boolean;
  enableCommitMsgLinting?: boolean;
  customLintPatterns?: string[];
  customExcludePatterns?: string[];
}): string {
  const {
    enableStagedLinting = false,
    enableCommitMsgLinting = false,
    customLintPatterns,
    customExcludePatterns,
  } = options;

  // Parse the base template
  const mod = parseModule("export default defineBasisConfig({})");

  // Get the config argument
  const configArg = mod.exports.default.$args[0];

  // Configure lint settings
  configArg.lint = {};
  configArg.lint.staged = {};

  if (enableStagedLinting) {
    configArg.lint.staged["*.{js,ts,jsx,tsx}"] = "eslint --fix";
    configArg.lint.staged["*.{css,scss,less}"] = "stylelint --fix";
  }

  configArg.lint.project = {
    patterns: customLintPatterns || [
      "src/**/*",
      "lib/**/*",
      "*.{js,ts,jsx,tsx}",
    ],
    exclude: customExcludePatterns || [
      "node_modules/**",
      "dist/**",
      "build/**",
    ],
  };

  // Configure git settings
  configArg.git = {};
  configArg.git.hooks = {};

  if (enableStagedLinting) {
    configArg.git.hooks["pre-commit"] = "basis lint --staged";
  }

  if (enableCommitMsgLinting) {
    configArg.git.hooks["commit-msg"] = "basis git --lint-commit";
  }

  configArg.git.commitMsg = {};

  // Add import if not exists
  if (!mod.imports.$items.some((item) => item.from === "@funish/basis")) {
    mod.imports.$prepend({
      from: "@funish/basis",
      imported: "defineBasisConfig",
    });
  }

  const { code } = generateCode(mod);
  return code;
}

/**
 * Interactive configuration setup
 */
async function interactiveSetup(): Promise<{
  enableStagedLinting: boolean;
  enableCommitMsgLinting: boolean;
  customLintPatterns?: string[];
}> {
  const enableStagedLinting = await consola.prompt(
    "Enable staged files linting?",
    {
      type: "confirm",
      initial: true,
    },
  );

  const enableCommitMsgLinting = await consola.prompt(
    "Enable commit message linting?",
    {
      type: "confirm",
      initial: true,
    },
  );

  let customLintPatterns: string[] | undefined;

  const useCustomPatterns = await consola.prompt(
    "Customize lint file patterns?",
    {
      type: "confirm",
      initial: false,
    },
  );

  if (useCustomPatterns) {
    const patternsInput = await consola.prompt(
      "Enter lint patterns (comma-separated):",
      {
        type: "text",
        initial: "src/**/*,lib/**/*,*.{js,ts,jsx,tsx}",
      },
    );

    if (typeof patternsInput === "string") {
      customLintPatterns = patternsInput.split(",").map((p) => p.trim());
    }
  }

  return {
    enableStagedLinting,
    enableCommitMsgLinting,
    customLintPatterns,
  };
}

/**
 * Initialize basis configuration in the current project
 */
export async function init(cwd = process.cwd(), options: InitOptions = {}) {
  const { force = false, skipGitCheck = false, skipInstall = false } = options;

  consola.start("Initializing basis configuration...");

  // Check if config already exists
  const configPath = resolve(cwd, "basis.config.ts");
  if ((await fileExists(configPath)) && !force) {
    consola.error("basis.config.ts already exists. Use --force to overwrite.");
    return false;
  }

  // Check if .git directory exists
  if (!skipGitCheck && !(await fileExists(resolve(cwd, ".git")))) {
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

  // Interactive setup
  let configContent: string;

  const useInteractive = await consola.prompt("Use interactive setup?", {
    type: "confirm",
    initial: true,
  });

  if (useInteractive) {
    const setupOptions = await interactiveSetup();
    configContent = generateCustomBasisConfig(setupOptions);
  } else {
    // Use minimal default configuration
    configContent = generateBasisConfig();
  }

  // Detect package manager
  const detected = await detectPackageManager(cwd);
  const packageManager = detected?.name || "npm";
  consola.info(`Detected package manager: ${packageManager}`);

  // Create config file
  await writeFile(configPath, configContent, "utf-8");
  consola.success("Created basis.config.ts with dynamic configuration");

  try {
    // Update package.json scripts and dependencies
    const pkg = await readPackageJSON(cwd);

    // Check if we're in a workspace root
    const isWorkspaceRoot = !!(
      pkg.workspaces || (await fileExists(resolve(cwd, "pnpm-workspace.yaml")))
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
    const hookInstallCommand = "basis git --setup";
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
  consola.info("  - Run `basis git setup` to install git hooks");

  return true;
}

/**
 * Preview generated configuration
 */
export function previewBasisConfig(
  options: {
    enableStagedLinting?: boolean;
    enableCommitMsgLinting?: boolean;
    customLintPatterns?: string[];
    customExcludePatterns?: string[];
  } = {},
): string {
  return generateCustomBasisConfig(options);
}

/**
 * Create minimal configuration for quick setup
 */
export function createMinimalConfig(): string {
  const mod = parseModule("export default defineBasisConfig({})");

  const configArg = mod.exports.default.$args[0];

  // Minimal configuration
  configArg.lint = {
    staged: {},
  };

  configArg.git = {
    hooks: {},
    commitMsg: {},
  };

  // Add import
  mod.imports.$prepend({
    from: "@funish/basis",
    imported: "defineBasisConfig",
  });

  const { code } = generateCode(mod);
  return code;
}
