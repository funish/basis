import { consola } from "consola";
import { defu } from "defu";
import { execa } from "execa";
import { detectPackageManager } from "nypm";
import { readPackageJSON } from "pkg-types";

import type { ReleaseConfig, PublishOptions } from "../types";

/**
 * Publish package to npm registry
 */
export async function publishToNpm(options: PublishOptions, config: ReleaseConfig): Promise<void> {
  const cwd = process.cwd();
  const packageJson = await readPackageJSON(cwd);
  const version = packageJson.version;
  const packageName = packageJson.name;

  if (!packageName) {
    throw new Error("Package name is required in package.json");
  }

  if (!version) {
    throw new Error("Package version is required in package.json");
  }

  // Detect package manager
  const detected = await detectPackageManager(cwd);
  const packageManager = detected?.name || "npm";

  // NPM config with defaults
  const npmConfig = defu(config.npm || {}, {
    tag: "latest",
    access: "public",
  });

  let publishTag = options.tag;
  if (!publishTag && version) {
    const prerelease = version.includes("-");
    if (prerelease) {
      const match = version.match(/-(\w+)\.\d+$/);
      if (match) {
        publishTag = match[1];
      }
    }
  }

  publishTag = publishTag || npmConfig.tag || "latest";

  // Build publish args
  const buildPublishArgs = (tag: string): string[] => {
    const args: string[] = [];

    if (options.tarball) {
      args.push(options.tarball);
    }

    args.push("--tag", tag);

    const access = options.access || npmConfig.access;
    if (access) {
      args.push("--access", access);
    }

    if (options.dryRun) {
      args.push("--dry-run");
    }

    if (options.otp) {
      args.push("--otp", options.otp);
    }

    return args;
  };

  // Publish to primary tag
  const primaryArgs = buildPublishArgs(publishTag);
  const publishArgs = ["publish", ...primaryArgs];
  await execa(packageManager, publishArgs, {
    stdio: "inherit",
  });
  consola.success(`Published ${packageName}@${version} with tag ${publishTag}`);

  // Add additional dist-tag
  const additionalTag = npmConfig.additionalTag;
  if (!options.dryRun && additionalTag && additionalTag !== publishTag) {
    await execa("npm", ["dist-tag", "add", `${packageName}@${version}`, additionalTag], {
      cwd,
      stdio: "inherit",
    });
  } else if (additionalTag) {
    consola.info(`Skipping dist-tag ${additionalTag} (same as publish tag ${publishTag})`);
  }
}

/**
 * Git operations for publish
 */
export async function publishGitOperations(
  version: string,
  gitConfig?: ReleaseConfig["git"],
): Promise<void> {
  const cwd = process.cwd();

  const tagPrefix = gitConfig?.tagPrefix;
  if (!tagPrefix) {
    throw new Error("Git tagPrefix is required in release.git config");
  }

  const tagName = `${tagPrefix}${version}`;

  const commitMessage = gitConfig?.message
    ? gitConfig.message(version)
    : `chore: release ${tagName}`;

  // Add and commit
  await execa("git", ["add", "package.json"], { cwd });
  await execa("git", ["commit", "-m", commitMessage], { cwd });

  // Create tag
  const tagArgs = ["tag", tagName, ...(gitConfig?.signTag ? ["--sign"] : [])];
  await execa("git", tagArgs, { cwd });

  // Push if configured
  if (gitConfig?.push) {
    await execa("git", ["push"], { cwd });
    await execa("git", ["push", "--tags"], { cwd });
  }
}
