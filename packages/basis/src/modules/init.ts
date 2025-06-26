import { updateConfig } from "c12/update";
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
import { setupGit } from "./git";

/**
 * Configuration file format options
 */
const CONFIG_FORMATS = {
  ts: { ext: "ts", label: "TypeScript" },
  mjs: { ext: "mjs", label: "ES Module" },
  cjs: { ext: "cjs", label: "CommonJS" },
} as const;

type ConfigFormat = keyof typeof CONFIG_FORMATS;

/**
 * Generate config file content based on format using magicast programmatically
 */
function generateConfigContent(format: ConfigFormat): string {
  // Create empty module
  const mod = parseModule("");

  if (format === "cjs") {
    // Add CommonJS import
    mod.imports.$prepend({
      from: "@funish/basis",
      imported: "defineBasisConfig",
      local: "defineBasisConfig",
    });

    // Create empty config object and function call
    mod.exports.default = builders.functionCall("defineBasisConfig", {});

    // Add comments to the config object
    const configArg = mod.exports.default.$args[0];
    configArg.$ast.leadingComments = [
      {
        type: "Block",
        value:
          "\n  Configure your project here\n  See: https://github.com/funish/basis/tree/main/packages/basis#configuration\n  ",
      },
    ];
  } else {
    // ES modules format (both .ts and .mjs)
    // Add ES import
    mod.imports.$prepend({
      from: "@funish/basis",
      imported: "defineBasisConfig",
      local: "defineBasisConfig",
    });

    // Create empty config object and function call
    mod.exports.default = builders.functionCall("defineBasisConfig", {});

    // Add comments to the config object
    const configArg = mod.exports.default.$args[0];
    configArg.$ast.leadingComments = [
      {
        type: "Block",
        value:
          "\n  Configure your project here\n  See: https://github.com/funish/basis/tree/main/packages/basis#configuration\n  ",
      },
    ];
  }

  return generateCode(mod).code;
}

/**
 * Detect recommended config format based on project
 */
async function detectConfigFormat(cwd: string): Promise<ConfigFormat> {
  // Check for TypeScript config
  if (await fileExists(resolve(cwd, "tsconfig.json"))) {
    return "ts";
  }

  // Check package.json for type: "module"
  try {
    const pkg = await readPackageJSON(cwd);
    if (pkg.type === "module") {
      return "mjs";
    }
  } catch {
    // Ignore error, fallback to default
  }

  return "ts"; // Default to TypeScript
}

/**
 * Initialize basis configuration in the current project
 */
export async function init(cwd = process.cwd(), options: InitOptions = {}) {
  const { force = false, skipGitCheck = false, skipInstall = false } = options;

  consola.start("Initializing basis configuration...");

  // Detect recommended config format
  const recommendedFormat = await detectConfigFormat(cwd);

  // Ask user for config format
  const configFormat = (await consola.prompt("Choose config file format:", {
    type: "select",
    initial: recommendedFormat,
    options: [
      {
        value: "ts",
        label: `${CONFIG_FORMATS.ts.label} (${CONFIG_FORMATS.ts.ext}) ${recommendedFormat === "ts" ? "(recommended)" : ""}`,
      },
      {
        value: "mjs",
        label: `${CONFIG_FORMATS.mjs.label} (${CONFIG_FORMATS.mjs.ext}) ${recommendedFormat === "mjs" ? "(recommended)" : ""}`,
      },
      {
        value: "cjs",
        label: `${CONFIG_FORMATS.cjs.label} (${CONFIG_FORMATS.cjs.ext}) ${recommendedFormat === "cjs" ? "(recommended)" : ""}`,
      },
    ],
  })) as ConfigFormat;

  const configExtension = CONFIG_FORMATS[configFormat].ext;
  const configFileName = `basis.config.${configExtension}`;
  const configPath = resolve(cwd, configFileName);

  // Check if config already exists
  if ((await fileExists(configPath)) && !force) {
    consola.error(
      `${configFileName} already exists. Use --force to overwrite.`,
    );
    return false;
  }

  // Check if .git directory exists and ask about git setup
  let shouldSetupGit = false;
  if (!skipGitCheck) {
    const hasGit = await fileExists(resolve(cwd, ".git"));
    if (hasGit) {
      shouldSetupGit = await consola.prompt(
        "Setup Git hooks and configuration?",
        {
          type: "confirm",
          initial: true,
        },
      );
    } else {
      consola.warn(
        "No .git directory found. Git hooks will not work properly.",
      );
      const shouldContinue = await consola.prompt("Continue anyway?", {
        type: "confirm",
        initial: false,
      });
      if (!shouldContinue) {
        consola.info("Initialization cancelled.");
        return false;
      }
    }
  }

  // Detect package manager
  const detected = await detectPackageManager(cwd);
  const packageManager = detected?.name || "npm";
  consola.info(`Detected package manager: ${packageManager}`);

  // Create empty config file
  await updateConfig({
    cwd,
    configFile: "basis.config",
    createExtension: configExtension,
    onCreate: () => {
      consola.info(`Creating ${configFileName}...`);
      return generateConfigContent(configFormat);
    },
  });

  consola.success(`Created ${configFileName}`);

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

  // Setup Git if requested
  if (shouldSetupGit) {
    consola.start("Setting up Git hooks and configuration...");
    const gitSuccess = await setupGit(cwd);
    if (gitSuccess) {
      consola.success("Git setup completed!");
    } else {
      consola.warn(
        "Git setup failed, but basis config was created successfully",
      );
    }
  }

  consola.success("Basis initialization completed!");
  consola.info("You can now:");
  consola.info(`  - Edit ${configFileName} to customize your configuration`);
  if (!shouldSetupGit) {
    consola.info("  - Run `basis git --setup` to install git hooks");
  }

  return true;
}
