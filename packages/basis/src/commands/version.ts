import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { readPackageJSON, writePackageJSON, resolvePackageJSON } from "pkg-types";
import { loadConfig } from "../utils";
import { calculateNewVersion } from "../modules/version";
import type { VersionOptions } from "../types";

export const versionCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "version",
    description: "Update package version",
  },
  args: {
    version: {
      type: "positional",
      description: "Version to set (patch, minor, major, prerelease, or specific version)",
      required: false,
    },
    preid: {
      type: "string",
      description: "Prerelease identifier (alpha, beta, rc)",
    },
    major: {
      type: "boolean",
      description: "Bump major version",
    },
    minor: {
      type: "boolean",
      description: "Bump minor version",
    },
    patch: {
      type: "boolean",
      description: "Bump patch version",
    },
    premajor: {
      type: "boolean",
      description: "Bump premajor version",
    },
    preminor: {
      type: "boolean",
      description: "Bump preminor version",
    },
    prepatch: {
      type: "boolean",
      description: "Bump prepatch version",
    },
    prerelease: {
      type: "boolean",
      description: "Bump prerelease version",
    },
  },
  async run({ args }) {
    try {
      const { config } = await loadConfig();

      const options: VersionOptions = {
        preid: args.preid,
        major: args.major,
        minor: args.minor,
        patch: args.patch || (!args.major && !args.minor && !args.version),
        premajor: args.premajor,
        preminor: args.preminor,
        prepatch: args.prepatch,
        prerelease: args.prerelease,
      };

      if (args.version) {
        const versionArg = args.version as string;
        const versionComponents = [
          "patch",
          "minor",
          "major",
          "prerelease",
          "premajor",
          "preminor",
          "prepatch",
        ];

        if (versionComponents.includes(versionArg)) {
          // Type assertion: versionArg is guaranteed to be a valid key
          (options as Record<string, unknown>)[versionArg] = true;
        } else {
          options.version = versionArg;
        }
      }

      const cwd = process.cwd();
      const packageJson = await readPackageJSON(cwd);
      const oldVersion = packageJson.version;

      if (!oldVersion) {
        throw new Error("No version found in package.json");
      }

      const newVersion = calculateNewVersion(oldVersion, options, config.version || {});

      const packageJsonPath = await resolvePackageJSON(cwd);
      await writePackageJSON(packageJsonPath, {
        ...packageJson,
        version: newVersion,
      });

      const packageName = packageJson.name || "unknown";
      consola.success(`${packageName} ${oldVersion} → ${newVersion}`);
    } catch (error) {
      consola.error("Version update failed:", error);
      process.exit(1);
    }
  },
});
