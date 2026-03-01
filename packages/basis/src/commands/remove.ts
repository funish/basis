import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { removeDependency } from "nypm";

export const removeCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "remove",
    description: "Remove dependencies",
  },
  async run({ rawArgs }) {
    if (rawArgs.length === 0) {
      consola.error("Please specify at least one package name");
      consola.info("Example: basis remove lodash");
      process.exit(1);
    }

    // Filter out flags from rawArgs to get package names
    const packages = rawArgs.filter((arg) => !arg.startsWith("-"));

    if (packages.length === 0) {
      consola.error("Please specify at least one package name");
      process.exit(1);
    }

    try {
      await removeDependency(packages, {
        cwd: process.cwd(),
      });

      consola.success(`Removed ${packages.join(", ")}`);
    } catch (error) {
      consola.error("Remove packages failed:", error);
      process.exit(1);
    }
  },
});
