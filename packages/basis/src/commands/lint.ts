import { defineCommand } from "citty";
import { consola } from "consola";
import { lintCommitMessage, lintStaged } from "../modules/lint";

export default defineCommand({
  meta: {
    name: "lint",
    description: "Run linting",
  },
  args: {
    staged: {
      type: "boolean",
      description: "Lint only staged files",
    },
    "commit-msg": {
      type: "boolean",
      description: "Lint commit message",
    },
  },
  async run({ args }) {
    try {
      let success = true;

      // Handle commit message linting
      if (args["commit-msg"]) {
        const commitResult = await lintCommitMessage();
        success = success && commitResult;
      }

      // Handle staged files linting (default)
      if (args.staged || !args["commit-msg"]) {
        const stagedResult = await lintStaged();
        success = success && stagedResult;
      }

      if (!success) {
        process.exit(1);
      }
    } catch (error) {
      consola.error("Lint failed:", error);
      process.exit(1);
    }
  },
});
