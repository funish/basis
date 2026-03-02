import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { readPackageJSON } from "pkg-types";
import { resolve, dirname } from "pathe";
import { existsSync } from "node:fs";
import { loadConfig } from "../config";
import { publishToNpm, publishGitOperations } from "../modules/publish";
import type { PublishOptions, PublishConfig } from "../types";

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
      // Try to find config file in parent directories
      let cwd = process.cwd();
      let configPath: string | undefined;

      // If in packages subdirectory, search in parent directories
      while (cwd !== dirname(cwd)) {
        const testPath = resolve(cwd, "basis.config.ts");
        if (existsSync(testPath)) {
          configPath = testPath;
          break;
        }
        cwd = dirname(cwd);
      }

      const { config } = await loadConfig({
        cwd: configPath ? dirname(configPath) : process.cwd(),
      });

      const options: PublishOptions = {
        tag: args.tag,
        git: args.git,
        access: (args.access as "public" | "restricted") || undefined,
        dryRun: args["dry-run"],
        otp: args.otp,
      };

      // Publish to npm
      await publishToNpm(options, config.publish || {});
      consola.success("Package published successfully");

      // Git operations if requested
      if (args.git && config.publish?.git) {
        consola.info("Creating git tag and commit...");

        const packageJson = await readPackageJSON(process.cwd());
        const version = packageJson.version;

        if (version) {
          await publishGitOperations(version, config.publish.git);
          consola.success("Git operations completed");
        }
      }
    } catch (error) {
      consola.error("Publish failed:", error);
      process.exit(1);
    }
  },
});
