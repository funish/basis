import { execSync } from "node:child_process";
import { consola } from "consola";
import { detectPackageManager, runScript } from "nypm";
import { readPackageJSON } from "pkg-types";
import semver from "semver";
import type { PublishConfig, PublishOptions, PublishResult } from "../types";
import { loadConfig } from "../utils";

/**
 * Determine publish tag based on version and options
 */
function determinePublishTag(
  version: string,
  options: PublishOptions,
  config: PublishConfig,
): string {
  if (options.tag) {
    return options.tag;
  }

  if (options.stable || options.latest) {
    return config.stableTag || "latest";
  }

  if (semver.prerelease(version)) {
    const prerelease = semver.prerelease(version);
    return (
      (prerelease && (prerelease[0] as string)) || config.defaultTag || "edge"
    );
  }

  return config.stableTag || "latest";
}

/**
 * Run pre-publish checks
 */
async function runPrePublishChecks(
  cwd: string,
  config: PublishConfig,
  options: PublishOptions,
): Promise<void> {
  // Check git status
  if (config.checkGitClean && !options.skipTests) {
    try {
      const status = execSync("git status --porcelain", {
        cwd,
        encoding: "utf8",
      });
      if (status.trim()) {
        throw new Error(
          "Working directory is not clean. Commit your changes first.",
        );
      }
    } catch (error) {
      consola.warn("Could not check git status:", error);
    }
  }

  // Run tests
  if (config.checkTests && !options.skipTests) {
    consola.start("Running tests...");
    try {
      if (config.testCommand) {
        execSync(config.testCommand, { cwd, stdio: "inherit" });
      } else {
        await runScript("test", { cwd, silent: false });
      }
    } catch (error) {
      consola.error("Tests failed");
      throw error;
    }
  }

  // Run build
  if (config.buildCommand && !options.skipBuild) {
    consola.start("Building package...");
    try {
      if (config.buildCommand.includes(" ")) {
        // Custom command with arguments, use execSync
        execSync(config.buildCommand, { cwd, stdio: "inherit" });
      } else {
        // Simple script name, use runScript
        await runScript(config.buildCommand, { cwd, silent: false });
      }
    } catch (error) {
      consola.error("Build failed");
      throw error;
    }
  }
}

/**
 * Run post-publish actions
 */
async function runPostPublishActions(
  cwd: string,
  config: PublishConfig,
): Promise<void> {
  if (config.autoGitPush) {
    try {
      execSync("git push", { cwd });
      if (config.createGitTag) {
        execSync("git push --tags", { cwd });
      }
    } catch (error) {
      consola.warn("Failed to push changes:", error);
    }
  }
}

/**
 * Publish package to npm registry
 */
export async function publishPackage(
  cwd: string,
  options: PublishOptions = {},
): Promise<PublishResult> {
  const { config } = await loadConfig({ cwd });
  const publishConfig = config.publish || {};

  // Read package.json using pkg-types
  const packageJson = await readPackageJSON(cwd);
  const { name: packageName, version } = packageJson;

  if (!packageName || !version) {
    throw new Error(
      "Missing name or version in package.json. Please ensure your package.json contains valid 'name' and 'version' fields.",
    );
  }

  // Validate version format
  if (!semver.valid(version)) {
    throw new Error(
      `Invalid version format in package.json: ${version}. Please use semantic versioning format (e.g., 1.0.0, 2.1.0-alpha.1)`,
    );
  }

  // Detect package manager
  const packageManager = await detectPackageManager(cwd);
  const pmCommand = packageManager?.command || "npm";

  // Run pre-publish checks
  await runPrePublishChecks(cwd, publishConfig, options);

  // Determine publish tag
  const publishTag = determinePublishTag(version, options, publishConfig);

  // Build publish command using detected package manager
  const publishArgs = [
    "publish",
    "--tag",
    publishTag,
    "--access",
    options.access || publishConfig.access || "public",
  ];

  if (options.registry || publishConfig.registry) {
    publishArgs.push(
      "--registry",
      options.registry || publishConfig.registry || "",
    );
  }

  if (options.dryRun) {
    publishArgs.push("--dry-run");
  }

  const publishCommand = `${pmCommand} ${publishArgs.join(" ")}`;

  consola.start("Publishing package...");

  try {
    execSync(publishCommand, { cwd, stdio: "inherit" });

    if (!options.dryRun) {
      // Note: Final success message is handled by the command layer

      // Always publish to defaultTag (edge) as well, unless it's the same tag
      const defaultTag = publishConfig.defaultTag || "edge";
      if (publishTag !== defaultTag) {
        consola.start(`Also publishing to ${defaultTag} tag...`);

        try {
          // Build dist-tag command based on package manager
          let distTagCommand: string;

          if (packageManager?.name === "yarn") {
            distTagCommand = `${pmCommand} tag add ${packageName}@${version} ${defaultTag}`;
          } else {
            // npm, pnpm, bun all use dist-tag syntax
            distTagCommand = `${pmCommand} dist-tag add ${packageName}@${version} ${defaultTag}`;
          }

          execSync(distTagCommand, { cwd, stdio: "inherit" });
        } catch (error) {
          consola.warn(`Failed to add ${defaultTag} tag:`, error);
        }
      }

      // Run post-publish actions
      await runPostPublishActions(cwd, publishConfig);
    }

    return {
      packageName,
      version,
      publishTag,
      dryRun: options.dryRun || false,
    };
  } catch (error) {
    consola.error("Failed to publish package:", error);
    throw error;
  }
}
