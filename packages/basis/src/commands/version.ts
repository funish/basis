import { defineCommand } from "citty";
import { consola } from "consola";
import { updatePackageVersion } from "../modules/version";
import type { VersionOptions } from "../types";

export default defineCommand({
  meta: {
    name: "version",
    description: "Update package version",
  },
  args: {
    patch: {
      type: "boolean",
      description: "Increment patch version",
    },
    minor: {
      type: "boolean",
      description: "Increment minor version",
    },
    major: {
      type: "boolean",
      description: "Increment major version",
    },
    prerelease: {
      type: "boolean",
      description: "Create prerelease version",
    },
    preid: {
      type: "string",
      description: "Prerelease identifier (alpha, beta, rc)",
    },
    tag: {
      type: "string",
      description: "Git tag name",
    },
    message: {
      type: "string",
      description: "Commit message template",
      alias: "m",
    },
    version: {
      type: "positional",
      description: "Specific version to set",
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();

      const options: VersionOptions = {
        version: args.version,
        patch: args.patch,
        minor: args.minor,
        major: args.major,
        prerelease: args.prerelease,
        preid: args.preid,
        message: args.message,
        tag: args.tag,
      };

      const result = await updatePackageVersion(cwd, options);
      consola.success(
        `Version updated: ${result.oldVersion} → ${result.newVersion}`,
      );

      if (result.tagName) {
        consola.info(`Git tag created: ${result.tagName}`);
      }
    } catch (error) {
      consola.error("Failed to update version:", error);
      process.exit(1);
    }
  },
});
