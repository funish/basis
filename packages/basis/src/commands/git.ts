import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { exec } from "dugite";
import { lintStagedFiles, lintCommitMessage, setupGit } from "../modules/git";

export const gitCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "git",
    description: "Git operations",
  },
  async run({ rawArgs }) {
    // Handle built-in subcommands
    const subCommand = rawArgs[0];

    if (!subCommand) {
      consola.info("Available subcommands: staged, lint-commit, setup");
      consola.info("Git passthrough mode: basis git <git-command>");
      return;
    }

    switch (subCommand) {
      case "staged": {
        const success = await lintStagedFiles();
        if (!success) {
          process.exit(1);
        }
        return;
      }

      case "lint-commit": {
        const success = await lintCommitMessage();
        if (!success) {
          process.exit(1);
        }
        return;
      }

      case "setup": {
        const success = await setupGit();
        if (!success) {
          process.exit(1);
        }
        return;
      }

      default:
        // Passthrough all other commands to git
        try {
          const result = await exec(rawArgs, process.cwd(), {
            processCallback: (childProcess) => {
              childProcess.stdout?.on("data", (data) => {
                process.stdout.write(data);
              });
              childProcess.stderr?.on("data", (data) => {
                process.stderr.write(data);
              });
            },
          });

          if (result.exitCode !== 0) {
            throw new Error(`git exited with code ${result.exitCode}`);
          }
        } catch (error) {
          consola.error("Git operation failed:", error);
          process.exit(1);
        }
    }
  },
});
