import { defineCommand } from "citty";
import { consola } from "consola";
import { addDependency, addDevDependency, type PackageManagerName } from "nypm";

export default defineCommand({
  meta: {
    name: "add",
    description: "Add dependencies to the project",
  },
  args: {
    packages: {
      type: "positional",
      description: "Packages to add",
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
      description: "Add as dev dependency",
      alias: "D",
    },
    workspace: {
      type: "string",
      description: "Workspace name",
      alias: "w",
    },
    global: {
      type: "boolean",
      description: "Install globally",
      alias: "g",
    },
  },
  async run({ args }) {
    try {
      const packages = Array.isArray(args.packages) ? args.packages : [args.packages];

      const options = {
        cwd: args.cwd,
        silent: args.silent,
        packageManager: args["package-manager"] as PackageManagerName,
        workspace: args.workspace,
        global: args.global,
      };

      if (args.dev) {
        await addDevDependency(packages, options);
        if (!args.silent) {
          consola.success(`Added ${packages.join(", ")} as dev dependencies`);
        }
      } else {
        await addDependency(packages, options);
        if (!args.silent) {
          consola.success(`Added ${packages.join(", ")} as dependencies`);
        }
      }
    } catch (error) {
      consola.error("Failed to add dependencies:", error);
      process.exit(1);
    }
  },
});
