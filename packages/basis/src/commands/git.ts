import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { exec } from "dugite";
import { lintStagedFiles, lintCommitMessage, setupGit } from "../modules/git";

export const gitCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "git",
    description: "Git operations",
  },
  subCommands: {
    staged: defineCommand({
      meta: {
        name: "staged",
        description: "Check staged files",
      },
      async run() {
        const success = await lintStagedFiles();
        if (!success) {
          process.exit(1);
        }
      },
    }),

    "lint-commit": defineCommand({
      meta: {
        name: "lint-commit",
        description: "Validate commit message",
      },
      async run() {
        const success = await lintCommitMessage();
        if (!success) {
          process.exit(1);
        }
      },
    }),

    setup: defineCommand({
      meta: {
        name: "setup",
        description: "Setup Git hooks and configuration",
      },
      async run() {
        const success = await setupGit();
        if (!success) {
          process.exit(1);
        }
      },
    }),
  },
  async run({ rawArgs }) {
    // If no args, show help
    if (rawArgs.length === 0) {
      consola.info("Available subcommands: staged, lint-commit, setup");
      consola.info("Git passthrough mode: basis git <git-command>");
      return;
    }

    // If first arg is a subcommand, don't passthrough (defensive check)
    const subCommandNames = ["staged", "lint-commit", "setup"];
    const firstArg = rawArgs[0];
    if (subCommandNames.includes(firstArg)) {
      return;
    }

    // Passthrough to git
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
  },
});
