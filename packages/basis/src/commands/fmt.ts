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

      // Run each formatter silently
      for (const formatterConfig of formatterConfigs) {
        const { runner, runnerOptions = {} } = formatterConfig;
        const formatter = createFormatterDriver(runner);

        // Merge config options with CLI options
        const options = {
          paths: runnerOptions.paths || paths,
          ...runnerOptions,
        };

        // Execute formatter (silent)
        if (args.check || options.check) {
          await formatter.check?.(options);
        } else {
          await formatter.format(options);
        }
      }

      // Single completion message
      consola.success("Formatting complete!");
    } catch (error) {
      consola.error("Formatting failed:", error);
      process.exit(1);
    }
  },
});
