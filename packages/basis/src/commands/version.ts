import { defineCommand } from "citty";
import { consola } from "consola";
import semver from "semver";
import { updatePackageVersion } from "../modules/version";
import type { VersionOptions } from "../types";

export default defineCommand({
  meta: {
    name: "version",
    description: "Update package version",
  },
  args: {
    version: {
      type: "positional",
      description:
        "Version to set (patch, minor, major, prerelease, or specific version like 1.2.3)",
      required: false,
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
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();

      // Parse the version argument and prepare options
      const versionArg = args.version;
      const options: VersionOptions = {
        preid: args.preid,
        message: args.message,
        tag: args.tag,
      };

      if (versionArg) {
        // Check if it's a version component or specific version number
        const versionComponents = ["patch", "minor", "major", "prerelease"];

        if (versionComponents.includes(versionArg)) {
          // It's a version component to increment
          options[
            versionArg as keyof Pick<
              VersionOptions,
              "patch" | "minor" | "major" | "prerelease"
            >
          ] = true;
        } else {
          // Check if it's a valid version number using semver
          if (semver.valid(versionArg)) {
            options.version = versionArg;
          } else {
            // Invalid input, show help
            consola.error(`Invalid version argument: ${versionArg}`);
            consola.info(
              "Valid options: patch, minor, major, prerelease, or specific version (e.g., 1.2.3)",
            );
            process.exit(1);
          }
        }
      }

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
