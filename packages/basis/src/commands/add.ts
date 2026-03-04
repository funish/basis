import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { addDependency, addDevDependency } from "nypm";

export const addCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "add",
    description: "Add dependencies",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Add as dev dependency",
      alias: "D",
    },
  },
  async run({ args, rawArgs }) {
    const packages = rawArgs.filter((arg) => !arg.startsWith("-"));

    if (packages.length === 0) {
      consola.error("Package name required");
      consola.info("Example: basis add lodash");
      process.exit(1);
    }

    try {
      if (args.dev) {
        await addDevDependency(packages, { cwd: process.cwd() });
        consola.success(`Added ${packages.join(", ")} as dev dependencies`);
      } else {
        await addDependency(packages, { cwd: process.cwd() });
        consola.success(`Added ${packages.join(", ")}`);
      }
    } catch (error) {
      consola.error("Failed to add packages:", error);
      process.exit(1);
    }
  },
});
