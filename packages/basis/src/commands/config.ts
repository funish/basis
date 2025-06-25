import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../utils";

export default defineCommand({
  meta: {
    name: "config",
    description: "View current basis configuration",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output configuration as JSON",
    },
    path: {
      type: "boolean",
      description: "Show configuration file path",
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();

      // Use c12's loadConfig to get both config and configFile path
      const { config, configFile } = await loadConfig({ cwd });

      if (args.path) {
        if (configFile) {
          consola.info(`Configuration file: ${configFile}`);
        } else {
          consola.warn("No configuration file found");
          consola.info("Run `basis init` to create one");
        }
        return;
      }

      if (Object.keys(config).length === 0) {
        consola.warn("No configuration found");
        consola.info("Run `basis init` to create a basis.config.ts file");
        return;
      }

      if (args.json) {
        consola.log(JSON.stringify(config, null, 2));
      } else {
        // Pretty print configuration
        consola.info("Current basis configuration:");

        if (configFile) {
          consola.log(`📁 Config file: ${configFile}`);
        }

        // Lint configuration
        if (config.lint) {
          consola.log("");
          consola.log("📝 Lint:");

          if (config.lint.staged) {
            consola.log("  Staged files:");
            for (const [pattern, command] of Object.entries(
              config.lint.staged,
            )) {
              consola.log(`    ${pattern}: ${command}`);
            }
          }

          if (config.lint.commitMsg) {
            consola.log("  Commit message:");
            if (config.lint.commitMsg.types) {
              consola.log(
                `    Types: ${config.lint.commitMsg.types.join(", ")}`,
              );
            }
            if (config.lint.commitMsg.maxLength) {
              consola.log(`    Max length: ${config.lint.commitMsg.maxLength}`);
            }
            if (config.lint.commitMsg.minLength) {
              consola.log(`    Min length: ${config.lint.commitMsg.minLength}`);
            }
          }
        }

        // Hooks configuration
        if (config.hooks) {
          consola.log("");
          consola.log("🪝 Hooks:");
          for (const [hook, command] of Object.entries(config.hooks)) {
            consola.log(`    ${hook}: ${command}`);
          }
        }
      }

      consola.success("Configuration loaded successfully");
    } catch (error) {
      consola.error("Failed to load configuration:", error);
      process.exit(1);
    }
  },
});
