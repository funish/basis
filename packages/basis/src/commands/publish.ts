import { defineCommand } from "citty";
import { consola } from "consola";
import { publishPackage } from "../modules/publish";
import type { PublishOptions } from "../types";

export default defineCommand({
  meta: {
    name: "publish",
    description: "Publish package to npm registry",
  },
  args: {
    tag: {
      type: "string",
      description: "Specific npm tag to publish to",
      alias: "t",
    },
    stable: {
      type: "boolean",
      description: "Publish as stable release (latest tag)",
      alias: "s",
    },
    latest: {
      type: "boolean",
      description: "Publish to latest tag",
      alias: "l",
    },
    dryRun: {
      type: "boolean",
      description: "Perform a dry run without actually publishing",
      alias: "d",
    },
    access: {
      type: "string",
      description: "Package access level (public/private)",
      alias: "a",
    },
    registry: {
      type: "string",
      description: "NPM registry URL",
      alias: "r",
    },
    skipBuild: {
      type: "boolean",
      description: "Skip build step",
    },
    skipTests: {
      type: "boolean",
      description: "Skip test step",
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();

      const options: PublishOptions = {
        tag: args.tag,
        stable: args.stable,
        latest: args.latest,
        dryRun: args.dryRun,
        access: args.access as "public" | "private" | undefined,
        registry: args.registry,
        skipBuild: args.skipBuild,
        skipTests: args.skipTests,
      };

      const result = await publishPackage(cwd, options);

      if (result.dryRun) {
        consola.success("Dry run completed successfully");
      } else {
        consola.success(
          `Published ${result.packageName}@${result.version} to ${result.publishTag}`,
        );
      }
    } catch (error) {
      consola.error("Failed to publish:", error);
      process.exit(1);
    }
  },
});
