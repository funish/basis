import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { dlx } from "nypm";

export const buildCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "build",
    description: "Build project",
  },
  async run({ rawArgs }) {
    try {
      await dlx("obuild", {
        args: rawArgs,
        cwd: process.cwd(),
      });

      consola.success("Build completed");
    } catch (error) {
      consola.error("Build failed:", error);
      process.exit(1);
    }
  },
});
