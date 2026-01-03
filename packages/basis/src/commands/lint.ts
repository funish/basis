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

      // Run each linter in order
      for (const linterConfig of linterConfigs) {
        const { runner, runnerOptions = {} } = linterConfig;

        consola.info(`Running linter: ${runner}`);

        const linter = createLinterDriver(runner);

        // Merge config options with CLI options
        const options = {
          paths: runnerOptions.paths || paths,
          ...runnerOptions,
        };

        if (args.fix || options.fix) {
          consola.start(`Running ${runner} with auto-fix...`);
          await linter.fix?.(options);
          consola.success(`${runner} linting complete!`);
        } else {
          consola.start(`Running ${runner}...`);
          await linter.lint(options);
          consola.success(`${runner} linting complete!`);
        }
      }
    } catch (error) {
      consola.error("Linting failed:", error);
      process.exit(1);
    }
  },
});
