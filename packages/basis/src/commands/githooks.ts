import { defineCommand } from "citty";
import { consola } from "consola";
import { installHooks, listHooks, uninstallHooks } from "../modules/githooks";
import type { GitHooksConfig } from "../types";

export default defineCommand({
  meta: {
    name: "hooks",
    description: "Manage git hooks",
  },
  subCommands: {
    install: defineCommand({
      meta: {
        name: "install",
        description: "Install git hooks",
      },
      args: {
        "auto-init-git": {
          type: "boolean",
          description: "Automatically initialize git repository if not found",
        },
        "skip-git-check": {
          type: "boolean",
          description: "Skip git command availability check",
        },
        force: {
          type: "boolean",
          alias: "f",
          description: "Force operation even if git is not available",
        },
      },
      async run({ args }) {
        try {
          // Only create config if CLI args are actually provided
          let config: GitHooksConfig | undefined;
          if (
            args["auto-init-git"] !== undefined ||
            args["skip-git-check"] !== undefined ||
            args.force !== undefined
          ) {
            config = {} as GitHooksConfig;
            if (args["auto-init-git"] !== undefined)
              config.autoInitGit = Boolean(args["auto-init-git"]);
            if (args["skip-git-check"] !== undefined)
              config.skipGitCheck = Boolean(args["skip-git-check"]);
            if (args.force !== undefined) config.force = Boolean(args.force);
          }
          await installHooks(process.cwd(), config);
        } catch (error) {
          consola.error("Failed to install hooks:", error);
          process.exit(1);
        }
      },
    }),
    uninstall: defineCommand({
      meta: {
        name: "uninstall",
        description: "Uninstall git hooks",
      },
      args: {
        "skip-git-check": {
          type: "boolean",
          description: "Skip git command availability check",
        },
        force: {
          type: "boolean",
          alias: "f",
          description: "Force operation even if git is not available",
        },
      },
      async run({ args }) {
        try {
          // Only create config if CLI args are actually provided
          let config: GitHooksConfig | undefined;
          if (
            args["skip-git-check"] !== undefined ||
            args.force !== undefined
          ) {
            config = {} as GitHooksConfig;
            if (args["skip-git-check"] !== undefined)
              config.skipGitCheck = Boolean(args["skip-git-check"]);
            if (args.force !== undefined) config.force = Boolean(args.force);
          }
          await uninstallHooks(process.cwd(), config);
        } catch (error) {
          consola.error("Failed to uninstall hooks:", error);
          process.exit(1);
        }
      },
    }),
    list: defineCommand({
      meta: {
        name: "list",
        description: "List configured hooks",
      },
      async run() {
        await listHooks();
      },
    }),
  },
});
