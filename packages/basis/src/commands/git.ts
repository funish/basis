import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";

import { lintCommitMessage, setupHooks } from "../modules/git";

export const gitCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "git",
    description: "Git operations",
  },
  async run({ rawArgs }) {
    const subCommand = rawArgs[0];

    if (!subCommand) {
      consola.info("Available subcommands: lint-commit, setup");
      return;
    }

    switch (subCommand) {
      case "lint-commit": {
        const success = await lintCommitMessage();
        if (!success) {
          process.exit(1);
        }
        return;
      }

      case "setup": {
        const success = await setupHooks();
        if (!success) {
          process.exit(1);
        }
        return;
      }

      default:
        consola.error(`Unknown git subcommand: ${subCommand}`);
        consola.info("Available subcommands: lint-commit, setup");
        process.exit(1);
    }
  },
});
