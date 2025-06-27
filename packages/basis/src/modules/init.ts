import { updateConfig } from "c12/update";
import { consola } from "consola";
import { generateCode, parseModule } from "magicast";
import { addDevDependency, detectPackageManager } from "nypm";
import { resolve } from "pathe";
import {
  findWorkspaceDir,
  type PackageJson,
  readPackageJSON,
  writePackageJSON,
} from "pkg-types";
import type { InitOptions } from "../types";
import { fileExists } from "../utils";
import { initGitRepo, setupGit } from "./git";

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
  // Create base template based on format
  const template =
    format === "cjs"
      ? `const { defineBasisConfig } = require("@funish/basis");\n\nmodule.exports = defineBasisConfig({});`
      : `import { defineBasisConfig } from "@funish/basis";\n\nexport default defineBasisConfig({});`;

  // Parse the template
  const mod = parseModule(template);

  // Create simplified config object with basic structure
  const configObject = {
    lint: {
      staged: {},
      project: {},
    },
    git: {
      hooks: {},
      autoSetup: true,
    },
    packageManager: {
      autoDetect: true,
    },
  };

  // Get the function call argument (the config object)
  const functionCall =
    format === "cjs" ? mod.exports.default : mod.exports.default;
  const configArg = functionCall.$args[0];

  // Replace empty object with our config structure
  Object.assign(configArg, configObject);

  // Add comments to the config object
  configArg.$ast.leadingComments = [
    {
      type: "Block",
      value:
        "\n  Configure your project here\n  See: https://github.com/funish/basis/tree/main/packages/basis#configuration\n  ",
    },
  ];

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
    options: Object.entries(CONFIG_FORMATS).map(([value, { label, ext }]) => ({
      value,
      label: `${label} (${ext}) ${recommendedFormat === value ? "(recommended)" : ""}`,
    })),
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
      consola.info("No Git repository found.");
      const shouldInitGit = await consola.prompt("Initialize Git repository?", {
        type: "confirm",
        initial: true,
      });

      if (shouldInitGit) {
        // Initialize Git repository first
        try {
          const gitInitSuccess = await initGitRepo(cwd);
          if (gitInitSuccess) {
            shouldSetupGit = await consola.prompt(
              "Setup Git hooks and configuration?",
              {
                type: "confirm",
                initial: true,
              },
            );
          } else {
            consola.warn("Git initialization failed, skipping Git setup");
            shouldSetupGit = false;
          }
        } catch (error) {
          consola.error("Failed to initialize Git repository:", error);
          consola.warn("Skipping Git setup");
          shouldSetupGit = false;
        }
      } else {
        consola.info("Skipping Git initialization");
        shouldSetupGit = false;
      }
    }
  }

  // Create config file
  await updateConfig({
    cwd,
    configFile: "basis.config",
    createExtension: `.${configExtension}`,
    onCreate: () => {
      return generateConfigContent(configFormat);
    },
  });

  // Ask about dependency installation
  let shouldInstallDeps = false;
  if (!skipInstall) {
    shouldInstallDeps = await consola.prompt(
      "Install @funish/basis dependency now?",
      {
        type: "confirm",
        initial: true,
      },
    );
  }

  // Check workspace configuration
  const workspaceDir = await findWorkspaceDir(cwd);
  const isWorkspaceRoot = workspaceDir === cwd;

  // Install dependencies if requested
  if (shouldInstallDeps) {
    try {
      // Use workspace option for addDevDependency
      await addDevDependency(["@funish/basis"], {
        workspace: isWorkspaceRoot,
      });
    } catch (error) {
      consola.error("Failed to install @funish/basis:", error);
      consola.info(
        "You can install it manually with: basis add -D @funish/basis",
      );
    }
  }

  // Add git setup script to package.json if needed
  if (shouldSetupGit) {
    try {
      const packageJsonPath = resolve(cwd, "package.json");

      if (await fileExists(packageJsonPath)) {
        const pkg: PackageJson = await readPackageJSON(packageJsonPath);

        // Detect package manager for script selection
        const detected = await detectPackageManager(cwd);
        const packageManager = detected?.name || "npm";

        // Add git setup script
        const hookInstallCommand = "basis git setup";
        pkg.scripts = pkg.scripts || {};

        // Determine script name based on package manager
        const scriptName =
          packageManager === "yarn" ? "prepare" : "postinstall";
        const existingScript = pkg.scripts[scriptName];

        let scriptAdded = false;
        if (!existingScript) {
          pkg.scripts[scriptName] = hookInstallCommand;
          scriptAdded = true;
        } else if (!existingScript.includes(hookInstallCommand)) {
          pkg.scripts[scriptName] =
            `${existingScript} && ${hookInstallCommand}`;
          scriptAdded = true;
        }

        if (scriptAdded) {
          await writePackageJSON(packageJsonPath, pkg);
        }
      } else {
        consola.warn(
          "No package.json found. You'll need to run git setup manually.",
        );
      }
    } catch (error) {
      consola.error("Failed to update package.json:", error);
      consola.warn(
        "You can manually add 'basis git setup' to your postinstall script",
      );
    }
  }

  // Only setup Git manually if dependencies were NOT installed
  // (because postinstall scripts already ran Git setup)
  if (shouldSetupGit && !shouldInstallDeps) {
    const gitSuccess = await setupGit(cwd);
    if (!gitSuccess) {
      consola.warn(
        "Git setup failed, but basis config was created successfully",
      );
    }
  }

  // Final success message - users need to know init completed
  consola.success("Basis initialization completed!");

  return true;
}
