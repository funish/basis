import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { initProject } from "../modules/init";

export const initCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "init",
    description: "Initialize configuration",
  },
  args: {
    force: {
      type: "boolean",
      description: "Overwrite existing configuration",
    },
    "skip-git-check": {
      type: "boolean",
      description: "Skip git directory check",
    },
    "skip-install": {
      type: "boolean",
      description: "Skip dependency installation",
    },
  },
  async run({ args }) {
    try {
      await initProject(process.cwd(), {
        force: args.force,
        skipGitCheck: args["skip-git-check"],
        skipInstall: args["skip-install"],
      });
    } catch (error) {
      consola.error("Init failed:", error);
      process.exit(1);
    }
  },
});
