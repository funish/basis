import { defineCommand } from "citty";
import { consola } from "consola";
import { createFormatterDriver } from "../formatters";
import { loadConfig } from "../utils";

export const fmt = defineCommand({
  meta: {
    name: "fmt",
    description: "Format code with configurable formatters (oxfmt/prettier/dprint)",
  },
  args: {
    check: {
      type: "boolean",
      description: "Check if files are formatted without modifying",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { config } = await loadConfig();
      const formatterConfigs = config.fmt || [];

      if (formatterConfigs.length === 0) {
        consola.warn("No formatters configured. Add formatters to your basis.config.ts");
        return;
      }

      // Get paths from positional arguments
      const paths = args._ && args._.length > 0 ? args._ : undefined;

      // Run each formatter in order
      for (const formatterConfig of formatterConfigs) {
        const { runner, runnerOptions = {} } = formatterConfig;

        consola.info(`Running formatter: ${runner}`);

        const formatter = createFormatterDriver(runner);

        // Merge config options with CLI options
        const options = {
          paths: runnerOptions.paths || paths,
          ...runnerOptions,
        };

        if (args.check || options.check) {
          consola.start(`Checking code formatting with ${runner}...`);
          await formatter.check?.(options);
          consola.success(`${runner} check complete!`);
        } else {
          consola.start(`Formatting code with ${runner}...`);
          await formatter.format(options);
          consola.success(`${runner} formatting complete!`);
        }
      }
    } catch (error) {
      consola.error("Formatting failed:", error);
      process.exit(1);
    }
  },
});
