import semver from "semver";
import type { VersionConfig, VersionOptions } from "../types";

/**
 * Calculate new version based on options
 */
export function calculateNewVersion(
  oldVersion: string,
  options: VersionOptions,
  config: VersionConfig,
): string {
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

  const currentPrerelease = semver.prerelease(oldVersion);
  const preid =
    options.preid ||
    (currentPrerelease && typeof currentPrerelease[0] === "string" ? currentPrerelease[0] : null) ||
    config.preid ||
    "edge";

  let releaseType: semver.ReleaseType = "patch";
  if (options.major) {
    releaseType = "major";
  } else if (options.minor) {
    releaseType = "minor";
  } else if (options.premajor) {
    releaseType = "premajor";
  } else if (options.preminor) {
    releaseType = "preminor";
  } else if (options.prepatch) {
    releaseType = "prepatch";
  } else if (options.prerelease) {
    releaseType = currentPrerelease ? "prerelease" : "prepatch";
  } else if (options.fromGit) {
    releaseType = "patch";
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
