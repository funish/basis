import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { dlx } from "nypm";

export const checkCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "check",
    description: "Type check code",
  },
  async run({ rawArgs }) {
    try {
      // Always add --noEmit at the beginning
      const checkArgs = ["--noEmit", ...rawArgs];

      await dlx("vue-tsc", {
        args: checkArgs,
        cwd: process.cwd(),
      });

      consola.success("Type checking completed");
    } catch (error) {
      consola.error("Type checking failed:", error);
      process.exit(1);
    }
  },
});
