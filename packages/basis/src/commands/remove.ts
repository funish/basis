import { defineCommand } from "citty";
import { consola } from "consola";
import { type PackageManagerName, removeDependency } from "nypm";

export default defineCommand({
  meta: {
    name: "remove",
    description: "Remove dependencies from the project",
  },
  args: {
    packages: {
      type: "positional",
      description: "Packages to remove",
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
    dev: {
      type: "boolean",
      description: "Remove from dev dependencies",
      alias: "D",
    },
    workspace: {
      type: "string",
      description: "Workspace name",
      alias: "w",
    },
    global: {
      type: "boolean",
      description: "Remove globally",
      alias: "g",
    },
  },
  async run({ args }) {
    try {
      const packages = Array.isArray(args.packages)
        ? args.packages
        : [args.packages];

      const options = {
        cwd: args.cwd,
        silent: args.silent,
        packageManager: args["package-manager"] as PackageManagerName,
        dev: args.dev,
        workspace: args.workspace,
        global: args.global,
      };

      for (const packageName of packages) {
        await removeDependency(packageName, options);
        if (!args.silent) {
          consola.success(`Removed ${packageName}`);
        }
      }
    } catch (error) {
      consola.error("Failed to remove dependencies:", error);
      process.exit(1);
    }
  },
});
