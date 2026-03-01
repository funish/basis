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
    if (rawArgs.length === 0) {
      consola.error("Please specify at least one package name");
      consola.info("Example: basis add lodash");
      process.exit(1);
    }

    // Filter out flags from rawArgs to get package names
    const packages = rawArgs.filter((arg) => !arg.startsWith("-"));

    if (packages.length === 0) {
      consola.error("Please specify at least one package name");
      process.exit(1);
    }

    try {
      if (args.dev) {
        await addDevDependency(packages, {
          cwd: process.cwd(),
        });
        consola.success(`Added ${packages.join(", ")} as dev dependencies`);
      } else {
        await addDependency(packages, {
          cwd: process.cwd(),
        });
        consola.success(`Added ${packages.join(", ")} as dependencies`);
      }
    } catch (error) {
      consola.error("Add packages failed:", error);
      process.exit(1);
    }
  },
});
