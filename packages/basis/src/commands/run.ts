import { defineCommand } from "citty";
import { consola } from "consola";
import { type PackageManagerName, runScript } from "nypm";

export default defineCommand({
  meta: {
    name: "run",
    description: "Run package scripts",
  },
  args: {
    script: {
      type: "positional",
      description: "Script name to run",
      required: true,
    },
    cwd: {
      type: "string",
      description: "Working directory",
      default: process.cwd(),
    },
    silent: {
      type: "boolean",
      description: "Silent mode",
      alias: "s",
    },
    "package-manager": {
      type: "string",
      description: "Package manager to use (npm, yarn, pnpm, bun, deno)",
      alias: "pm",
    },
  },
  async run({ args }) {
    try {
      await runScript(args.script, {
        cwd: args.cwd,
        silent: args.silent,
        packageManager: args["package-manager"] as PackageManagerName,
      });

      if (!args.silent) {
        consola.success(`Script "${args.script}" completed successfully`);
      }
    } catch (error) {
      consola.error(`Failed to run script "${args.script}":`, error);
      process.exit(1);
    }
  },
});
