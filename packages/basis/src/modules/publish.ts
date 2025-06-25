import { execSync } from "node:child_process";
import { consola } from "consola";
import { detectPackageManager, runScript } from "nypm";
import { readPackageJSON } from "pkg-types";
import semver from "semver";
import type { PublishConfig, PublishOptions, PublishResult } from "../types";
import { loadConfig } from "../utils";

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
      consola.success("Tests passed");
    } catch (error) {
      consola.error("Tests failed");
      throw error;
    }
  }

  // Run build
  if (config.buildCommand && !options.skipBuild) {
    consola.start("Building package...");
    try {
      execSync(config.buildCommand, { cwd, stdio: "inherit" });
      consola.success("Build completed");
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
      consola.success("Pushed changes to remote");
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
    throw new Error("Missing name or version in package.json");
  }

  // Validate version format
  if (!semver.valid(version)) {
    throw new Error(`Invalid version format in package.json: ${version}`);
  }

  // Detect package manager
  const packageManager = await detectPackageManager(cwd);
  const pmCommand = packageManager?.command || "npm";

  // Run pre-publish checks
  await runPrePublishChecks(cwd, publishConfig, options);

  // Determine publish tag directly using semver
  let publishTag: string;

  if (options.tag) {
    publishTag = options.tag;
  } else if (options.stable || options.latest) {
    publishTag = publishConfig.stableTag || "latest";
  } else if (semver.prerelease(version)) {
    // Extract prerelease identifier for prerelease versions
    const prerelease = semver.prerelease(version);
    publishTag =
      (prerelease && (prerelease[0] as string)) ||
      publishConfig.defaultTag ||
      "edge";
  } else {
    // Stable versions go to latest tag
    publishTag = publishConfig.stableTag || "latest";
  }

  consola.info(`Publishing ${packageName}@${version} to tag: ${publishTag}`);

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
      consola.success(`Published ${packageName}@${version} to ${publishTag}`);

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
          consola.success(
            `Also published ${packageName}@${version} to ${defaultTag}`,
          );
        } catch (error) {
          consola.warn(`Failed to add ${defaultTag} tag:`, error);
        }
      }

      // Run post-publish actions
      await runPostPublishActions(cwd, publishConfig);
    } else {
      consola.success("Dry run completed successfully");
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
