import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { readPackageJSON } from "pkg-types";

import { publishToNpm, publishGitOperations } from "../modules/publish";
import type { PublishOptions } from "../types";
import { loadConfig } from "../utils";

export const publishCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "publish",
    description: "Publish to registry",
  },
  args: {
    tag: {
      type: "string",
      description: "Publish tag",
    },
    git: {
      type: "boolean",
      description: "Also create git tag and commit",
    },
    access: {
      type: "string",
      description: "Package access level (public, restricted)",
    },
    "dry-run": {
      type: "boolean",
      description: "Dry run mode",
    },
    otp: {
      type: "string",
      description: "One-time password for 2FA",
    },
  },
  async run({ args }) {
    try {
      const { config } = await loadConfig();
      const releaseConfig = config.release || {};

      const options: PublishOptions = {
        tag: args.tag,
        git: args.git,
        access: (args.access as "public" | "restricted") || undefined,
        dryRun: args["dry-run"],
        otp: args.otp,
      };

      // Publish to npm
      await publishToNpm(options, releaseConfig);

      // Git operations if requested
      if (args.git && releaseConfig.git) {
        consola.info("Creating git tag and commit...");

        const packageJson = await readPackageJSON(process.cwd());
        const version = packageJson.version;

        if (version) {
          await publishGitOperations(version, releaseConfig.git);
          consola.success("Git operations completed");
        }
      }
    } catch (error) {
      consola.error("Publish failed:", error);
      process.exit(1);
    }
  },
});
