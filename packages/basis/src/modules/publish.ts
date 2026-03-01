import { spawn, execSync } from "node:child_process";
import { exec } from "dugite";
import { readPackageJSON } from "pkg-types";
import { detectPackageManager } from "nypm";
import type { PublishConfig, PublishOptions } from "../types";

/**
 * Publish package to npm registry
 */
export async function publishToNpm(options: PublishOptions, config: PublishConfig): Promise<void> {
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
  const npmConfig = config.npm || { tag: "latest", access: "public" };

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
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(packageManager, ["publish", ...primaryArgs], {
      stdio: "inherit",
      shell: true,
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${packageManager} publish exited with code ${code}`));
    });
  });

  // Add additional dist-tag (unless dry run)
  // Note: Always use npm for dist-tag as bun/deno don't support it
  const additionalTag = npmConfig.additionalTag;
  if (!options.dryRun && additionalTag && additionalTag !== publishTag) {
    execSync(`npm dist-tag add ${packageName}@${version} ${additionalTag}`, {
      cwd,
      stdio: "inherit",
    });
  }
}

/**
 * Git operations for publish
 */
export async function publishGitOperations(
  version: string,
  gitConfig?: PublishConfig["git"],
): Promise<void> {
  const cwd = process.cwd();

  // Apply defaults from config.ts
  const tagPrefix = gitConfig?.tagPrefix;
  if (!tagPrefix) {
    throw new Error("Git tagPrefix is required");
  }

  const tagName = `${tagPrefix}${version}`;

  const commitMessage = gitConfig?.message
    ? gitConfig.message(version)
    : `chore: release ${tagName}`;

  // Add and commit
  await exec(["add", "package.json"], cwd);

  await exec(["commit", "-m", commitMessage], cwd);

  // Create tag
  const tagArgs = ["tag", tagName, ...(gitConfig?.signTag ? ["--sign"] : [])];
  await exec(tagArgs, cwd);

  // Push if configured
  if (gitConfig?.push) {
    await exec(["push"], cwd);
    await exec(["push", "--tags"], cwd);
  }
}
