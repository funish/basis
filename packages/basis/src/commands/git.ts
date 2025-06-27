import { defineCommand } from "citty";
import { consola } from "consola";
import {
  initGitRepo,
  lintCommitMessage,
  removeGitHooks,
  resetGitConfig,
  setupGit,
  setupGitConfig,
  setupGitHooks,
} from "../modules/git";

export const git = defineCommand({
  meta: {
    name: "git",
    description: "Git configuration and hooks management",
  },
  subCommands: {
    setup: defineCommand({
      meta: {
        name: "setup",
        description: "Setup Git configuration and hooks",
      },
      async run() {
        const cwd = process.cwd();

        const success = await setupGit(cwd);

        if (!success) {
          process.exit(1);
        }
      },
    }),

    config: defineCommand({
      meta: {
        name: "config",
        description: "Setup Git configuration only",
      },
      async run() {
        const cwd = process.cwd();

        const success = await setupGitConfig(cwd);

        if (!success) {
          consola.error("Git configuration failed");
          process.exit(1);
        }
      },
    }),

    hooks: defineCommand({
      meta: {
        name: "hooks",
        description: "Setup Git hooks only",
      },
      async run() {
        const cwd = process.cwd();

        const success = await setupGitHooks(cwd);

        if (!success) {
          consola.error("Git hooks setup failed");
          process.exit(1);
        }
      },
    }),

    remove: defineCommand({
      meta: {
        name: "remove",
        description: "Remove Git hooks",
      },
      args: {
        hooks: {
          type: "positional",
          description: "Specific hook names to remove (optional)",
          required: false,
        },
        "update-config": {
          type: "boolean",
          description: "Also remove hooks configuration from basis.config.ts",
          default: false,
        },
      },
      async run({ args }) {
        const cwd = process.cwd();
        const hooksToRemove =
          args.hooks && typeof args.hooks === "string"
            ? [args.hooks]
            : Array.isArray(args.hooks)
              ? args.hooks.filter(
                  (hook): hook is string => typeof hook === "string",
                )
              : undefined;
        const updateConfig =
          typeof args["update-config"] === "boolean"
            ? args["update-config"]
            : false;
        const success = await removeGitHooks(cwd, hooksToRemove, {
          updateConfig,
        });

        if (!success) {
          consola.error("Git hooks removal failed");
          process.exit(1);
        }
      },
    }),

    reset: defineCommand({
      meta: {
        name: "reset",
        description: "Reset Git configuration (keeps user info by default)",
      },
      args: {
        "keep-user": {
          type: "boolean",
          description: "Keep user information (name, email)",
          default: true,
        },
        "update-config": {
          type: "boolean",
          description: "Also remove git config from basis.config.ts",
          default: false,
        },
      },
      async run({ args }) {
        const cwd = process.cwd();

        const keepUser =
          typeof args["keep-user"] === "boolean" ? args["keep-user"] : true;
        const updateConfig =
          typeof args["update-config"] === "boolean"
            ? args["update-config"]
            : false;
        const success = await resetGitConfig(cwd, keepUser, { updateConfig });

        if (!success) {
          consola.error("Git configuration reset failed");
          process.exit(1);
        }
      },
    }),

    init: defineCommand({
      meta: {
        name: "init",
        description: "Initialize Git repository with basis configuration",
      },
      async run() {
        const cwd = process.cwd();

        const success = await initGitRepo(cwd);

        if (!success) {
          consola.error("Git initialization failed");
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
        const cwd = process.cwd();

        const success = await lintCommitMessage(cwd);

        if (!success) {
          consola.error("Commit message validation failed");
          process.exit(1);
        }
      },
    }),
  },

  // Default action when no subcommand is provided
  async run() {},
});
