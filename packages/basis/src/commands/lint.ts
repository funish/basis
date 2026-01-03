import { defineCommand } from "citty";
import { consola } from "consola";
import { createLinterDriver } from "../linters";
import { loadConfig } from "../utils";

export const lint = defineCommand({
  meta: {
    name: "lint",
    description: "Lint code with configurable linters (oxlint/eslint/tsc)",
  },
  args: {
    fix: {
      type: "boolean",
      description: "Auto-fix linting issues",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { config } = await loadConfig();
      const linterConfigs = config.lint || [];

      if (linterConfigs.length === 0) {
        consola.warn("No linters configured. Add linters to your basis.config.ts");
        return;
      }

      // Get paths from positional arguments
      const paths = args._ && args._.length > 0 ? args._ : undefined;

      // Run each linter silently
      for (const linterConfig of linterConfigs) {
        const { runner, runnerOptions = {} } = linterConfig;
        const linter = createLinterDriver(runner);

        // Merge config options with CLI options
        const options = {
          paths: runnerOptions.paths || paths,
          ...runnerOptions,
        };

        // Execute linter (silent)
        if (args.fix || options.fix) {
          await linter.fix?.(options);
        } else {
          await linter.lint(options);
        }
      }

      // Single completion message
      consola.success("Linting complete!");
    } catch (error) {
      consola.error("Linting failed:", error);
      process.exit(1);
    }
  },
});
