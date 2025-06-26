import { execSync } from "node:child_process";
import { consola } from "consola";
import {
  readPackageJSON,
  resolvePackageJSON,
  writePackageJSON,
} from "pkg-types";
import semver from "semver";
import type { VersionOptions, VersionUpdateResult } from "../types";
import { loadConfig } from "../utils";

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

  // Calculate new version directly using semver
  const newVersion = options.version
    ? semver.valid(options.version)
      ? options.version
      : (() => {
          throw new Error(`Invalid version format: ${options.version}`);
        })()
    : (() => {
        if (!semver.valid(oldVersion)) {
          throw new Error(`Invalid current version format: ${oldVersion}`);
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

        // Determine release type with smart defaults
        let releaseType: semver.ReleaseType;
        if (options.major) {
          releaseType = "major";
        } else if (options.minor) {
          releaseType = "minor";
        } else if (options.prerelease) {
          // Smart handling: if already prerelease, increment it; otherwise create prepatch
          releaseType = currentPrerelease ? "prerelease" : "prepatch";
        } else {
          // Default behavior: if already prerelease, continue prerelease; otherwise patch
          releaseType = currentPrerelease ? "prerelease" : "patch";
        }

        const result =
          releaseType === "prerelease" || releaseType.startsWith("pre")
            ? semver.inc(oldVersion, releaseType, preid)
            : semver.inc(oldVersion, releaseType);

        if (!result) throw new Error("Failed to calculate new version");
        return result;
      })();

  consola.info(`Updating version: ${oldVersion} → ${newVersion}`);

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
      consola.success(`Committed version update: ${commitMessage}`);
    } catch (error) {
      consola.warn("Failed to commit changes:", error);
    }
  }

  if (versionConfig.autoTag) {
    const tagName = `${versionConfig.tagPrefix || "v"}${newVersion}`;
    try {
      execSync(`git tag ${tagName}`, { cwd });
      consola.success(`Created git tag: ${tagName}`);
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
      consola.success("Pushed changes to remote");
    } catch (error) {
      consola.warn("Failed to push changes:", error);
    }
  }

  return result;
}
