import { defineCommand } from "citty";
import { consola } from "consola";
import { init } from "../modules/init";

export default defineCommand({
  meta: {
    name: "init",
    description: "Initialize basis configuration",
  },
  args: {
    force: {
      type: "boolean",
      alias: "f",
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
      await init(process.cwd(), {
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
