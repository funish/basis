import { execSync } from "node:child_process";
import { consola } from "consola";
import {
  readPackageJSON,
  resolvePackageJSON,
  writePackageJSON,
} from "pkg-types";
import semver from "semver";
import type {
  VersionConfig,
  VersionOptions,
  VersionUpdateResult,
} from "../types";
import { loadConfig } from "../utils";

/**
 * Calculate new version based on options and config
 */
function calculateNewVersion(
  oldVersion: string,
  options: VersionOptions,
  versionConfig: VersionConfig,
): string {
  // Use provided version if valid
  if (options.version) {
    if (semver.valid(options.version)) {
      return options.version;
    }
    throw new Error(
      `Invalid version format: ${options.version}. Please use semantic versioning format (e.g., 1.0.0, 2.1.0-alpha.1)`,
    );
  }

  if (!semver.valid(oldVersion)) {
    throw new Error(
      `Invalid current version format: ${oldVersion}. Please fix version in package.json to use semantic versioning format (e.g., 1.0.0)`,
    );
  }

  // Get current prerelease info
  const currentPrerelease = semver.prerelease(oldVersion);

  // Determine preid: use provided preid, or current prerelease tag, or default from config
  const preid =
    options.preid ||
    (currentPrerelease && typeof currentPrerelease[0] === "string"
      ? currentPrerelease[0]
      : null) ||
    versionConfig.prereleaseId ||
    "edge";

  // Determine release type
  let releaseType: semver.ReleaseType;
  if (options.major) {
    releaseType = "major";
  } else if (options.minor) {
    releaseType = "minor";
  } else if (options.prerelease) {
    releaseType = currentPrerelease ? "prerelease" : "prepatch";
  } else {
    releaseType = currentPrerelease ? "prerelease" : "patch";
  }

  const result =
    releaseType === "prerelease" || releaseType.startsWith("pre")
      ? semver.inc(oldVersion, releaseType, preid)
      : semver.inc(oldVersion, releaseType);

  if (!result) {
    throw new Error(
      `Failed to calculate new version from ${oldVersion}. Please check your version increment options.`,
    );
  }
  return result;
}

/**
 * Update package.json version
 */
export async function updatePackageVersion(
  cwd: string,
  options: VersionOptions = {},
): Promise<VersionUpdateResult> {
  const { config } = await loadConfig({ cwd });
  const versionConfig = config.version || {};

  // Read package.json using pkg-types
  const packageJson = await readPackageJSON(cwd);
  const oldVersion = packageJson.version;

  if (!oldVersion) {
    throw new Error("No version found in package.json");
  }

  // Calculate new version
  const newVersion = calculateNewVersion(oldVersion, options, versionConfig);

  // Update and write package.json using pkg-types
  const packageJsonPath = await resolvePackageJSON(cwd);
  await writePackageJSON(packageJsonPath, {
    ...packageJson,
    version: newVersion,
  });

  const result: VersionUpdateResult = { oldVersion, newVersion };

  // Git operations
  if (versionConfig.autoCommit) {
    const commitMessage =
      options.message ||
      versionConfig.commitMessage?.replace("{version}", newVersion) ||
      `chore: release v${newVersion}`;

    try {
      execSync("git add package.json", { cwd });
      execSync(`git commit -m "${commitMessage}"`, { cwd });
    } catch (error) {
      consola.warn("Failed to commit changes:", error);
    }
  }

  if (versionConfig.autoTag) {
    const tagName = `${versionConfig.tagPrefix || "v"}${newVersion}`;
    try {
      execSync(`git tag ${tagName}`, { cwd });

      result.tagName = tagName;
    } catch (error) {
      consola.warn("Failed to create git tag:", error);
    }
  }

  if (versionConfig.autoPush) {
    try {
      execSync("git push", { cwd });
      if (versionConfig.autoTag) {
        execSync("git push --tags", { cwd });
      }
    } catch (error) {
      consola.warn("Failed to push changes:", error);
    }
  }

  return result;
}
