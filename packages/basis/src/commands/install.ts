import { defineCommand } from "citty";
import { consola } from "consola";
import { installDependencies, type PackageManagerName } from "nypm";

export default defineCommand({
  meta: {
    name: "install",
    description: "Install project dependencies",
  },
  args: {
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
    "frozen-lockfile": {
      type: "boolean",
      description: "Install with frozen lockfile",
      alias: "f",
    },
  },
  async run({ args }) {
    try {
      await installDependencies({
        cwd: args.cwd,
        silent: args.silent,
        packageManager: args["package-manager"] as PackageManagerName,
        frozenLockFile: args["frozen-lockfile"],
      });

      if (!args.silent) {
        consola.success("Dependencies installed successfully");
      }
    } catch (error) {
      consola.error("Failed to install dependencies:", error);
      process.exit(1);
    }
  },
});
