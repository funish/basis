import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { dlx } from "nypm";

export const dlxCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "dlx",
    description: "Execute package without installation",
  },
  async run({ rawArgs }) {
    try {
      if (rawArgs.length === 0) {
        consola.error("Please specify a package to run");
        process.exit(1);
      }

      const [packageName, ...additionalArgs] = rawArgs;

      await dlx(packageName, {
        args: additionalArgs,
        cwd: process.cwd(),
      });

      consola.success("Dlx completed");
    } catch (error) {
      consola.error("Dlx failed:", error);
      process.exit(1);
    }
  },
});
