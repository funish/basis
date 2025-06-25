import { execSync } from "node:child_process";
import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { consola } from "consola";
import { join } from "pathe";
import type { GitHooksConfig, ValidGitHook } from "../types";
import { VALID_GIT_HOOKS } from "../types";
import { loadConfig } from "../utils";

/**
 * Check if git command is available
 */
async function isGitAvailable(): Promise<boolean> {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current directory is a git repository
 */
async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await access(join(cwd, ".git"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize git repository
 */
async function initGitRepository(cwd: string): Promise<void> {
  try {
    execSync("git init", { cwd, stdio: "inherit" });
    consola.success("Initialized git repository");
  } catch (error) {
    consola.error("Failed to initialize git repository:", error);
    throw error;
  }
}

/**
 * Check if a hook name is a valid Git hook
 */
function isValidGitHook(hookName: string): hookName is ValidGitHook {
  return (VALID_GIT_HOOKS as readonly string[]).includes(hookName);
}

/**
 * Filter hook configuration to separate hooks from options
 */
function separateHooksAndOptions(config: GitHooksConfig): {
  hooks: Record<string, string>;
  options: { autoInitGit?: boolean; skipGitCheck?: boolean; force?: boolean };
} {
  const hooks: Record<string, string> = {};
  const options: {
    autoInitGit?: boolean;
    skipGitCheck?: boolean;
    force?: boolean;
  } = {
    autoInitGit: config.autoInitGit,
    skipGitCheck: config.skipGitCheck,
    force: config.force,
  };

  // Extract only valid git hooks
  for (const [key, value] of Object.entries(config)) {
    if (
      key !== "autoInitGit" &&
      key !== "skipGitCheck" &&
      key !== "force" &&
      typeof value === "string"
    ) {
      hooks[key] = value;
    }
  }

  return { hooks, options };
}

/**
 * Validate hook names against Git official hooks
 */
function validateHookNames(hooks: Record<string, string>): {
  valid: boolean;
  invalidHooks: string[];
} {
  const invalidHooks: string[] = [];

  for (const hookName of Object.keys(hooks)) {
    if (!isValidGitHook(hookName)) {
      invalidHooks.push(hookName);
    }
  }

  return { valid: invalidHooks.length === 0, invalidHooks };
}

export async function installHooks(
  cwd = process.cwd(),
  config?: GitHooksConfig,
) {
  // Load config with c12 smart merging - config parameter overrides file config
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { githooks: config } : undefined,
  });
  // Don't use || {} as it might override c12's default merging
  const hooksConfig = loadedConfig.githooks;

  // Handle undefined hooksConfig (shouldn't happen with proper defaults, but just in case)
  if (!hooksConfig) {
    consola.error("No hooks configuration found");
    return;
  }

  // Separate hooks and options
  const { hooks, options } = separateHooksAndOptions(hooksConfig);

  // Check git availability
  if (!options.skipGitCheck && !options.force) {
    const gitAvailable = await isGitAvailable();
    if (!gitAvailable) {
      consola.error(
        "Git command not found. Please install git or use --force option.",
      );
      throw new Error("Git command not available");
    }
  }

  // Check if current directory is a git repository
  const isRepo = await isGitRepository(cwd);
  if (!isRepo) {
    if (options.autoInitGit) {
      consola.info("Not a git repository, initializing...");
      await initGitRepository(cwd);
    } else {
      consola.error(
        "Not a git repository. Use --auto-init-git option or run 'git init' first.",
      );
      throw new Error("Not a git repository");
    }
  }

  // Validate hook names
  const validation = validateHookNames(hooks);
  if (!validation.valid) {
    consola.error("Invalid hook names found:");
    validation.invalidHooks.forEach((hookName) => {
      consola.error(`  ✗ ${hookName} (not a valid Git hook)`);
    });
    consola.info("Valid Git hooks:", VALID_GIT_HOOKS.join(", "));
    throw new Error(
      `Invalid hook names: ${validation.invalidHooks.join(", ")}`,
    );
  }

  consola.start("Installing git hooks...");

  if (Object.keys(hooks).length === 0) {
    consola.warn("No hooks configured");
    return;
  }

  try {
    const gitHooksDir = join(cwd, ".git", "hooks");
    await mkdir(gitHooksDir, { recursive: true });

    for (const [hookName, command] of Object.entries(hooks)) {
      const hookPath = join(gitHooksDir, hookName);
      const hookContent = generateHookScript(command);

      await writeFile(hookPath, hookContent, "utf-8");
      await chmod(hookPath, 0o755); // Make executable

      consola.info(`Installed ${hookName} hook`);
    }

    consola.success(`Installed ${Object.keys(hooks).length} git hooks`);
  } catch (error) {
    consola.error("Failed to install hooks:", error);
    throw error;
  }
}

export async function uninstallHooks(
  cwd = process.cwd(),
  config?: GitHooksConfig,
) {
  // Load config with c12 smart merging - config parameter overrides file config
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { githooks: config } : undefined,
  });
  const hooksConfig = loadedConfig.githooks || {};

  // Separate hooks and options
  const { hooks, options } = separateHooksAndOptions(hooksConfig);

  // Check git availability
  if (!options.skipGitCheck && !options.force) {
    const gitAvailable = await isGitAvailable();
    if (!gitAvailable) {
      consola.error(
        "Git command not found. Please install git or use --force option.",
      );
      throw new Error("Git command not available");
    }
  }

  // Check if current directory is a git repository
  const isRepo = await isGitRepository(cwd);
  if (!isRepo && !options.force) {
    consola.error("Not a git repository.");
    throw new Error("Not a git repository");
  }

  // Validate hook names
  const validation = validateHookNames(hooks);
  if (!validation.valid) {
    consola.error("Invalid hook names found:");
    validation.invalidHooks.forEach((hookName) => {
      consola.error(`  ✗ ${hookName} (not a valid Git hook)`);
    });
    throw new Error(
      `Invalid hook names: ${validation.invalidHooks.join(", ")}`,
    );
  }

  consola.start("Uninstalling git hooks...");

  try {
    const gitHooksDir = join(cwd, ".git", "hooks");

    for (const hookName of Object.keys(hooks)) {
      const hookPath = join(gitHooksDir, hookName);
      try {
        await writeFile(hookPath, "", "utf-8"); // Clear the hook
        consola.info(`Uninstalled ${hookName} hook`);
      } catch (_error) {
        // Hook file might not exist, continue
      }
    }

    consola.success("Git hooks uninstalled");
  } catch (error) {
    consola.error("Failed to uninstall hooks:", error);
    throw error;
  }
}

export async function listHooks(cwd = process.cwd(), config?: GitHooksConfig) {
  // Load config with c12 smart merging - config parameter overrides file config
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { githooks: config } : undefined,
  });
  const hooksConfig = loadedConfig.githooks || {};

  // Separate hooks and options
  const { hooks, options } = separateHooksAndOptions(hooksConfig);

  consola.info("Configured git hooks:");

  if (Object.keys(hooks).length === 0) {
    consola.info("No hooks configured");
    return;
  }

  // Show configuration options if any
  if (options.autoInitGit || options.skipGitCheck || options.force) {
    consola.info("Options:");
    if (options.autoInitGit) consola.info("  • Auto-init git: enabled");
    if (options.skipGitCheck) consola.info("  • Skip git check: enabled");
    if (options.force) consola.info("  • Force: enabled");
  }

  // Validate hook names and warn about invalid ones
  const validation = validateHookNames(hooks);
  if (!validation.valid) {
    consola.warn("Warning: Found invalid hook names:");
    validation.invalidHooks.forEach((hookName) => {
      consola.warn(`  ⚠ ${hookName} (not a valid Git hook)`);
    });
  }

  for (const [hookName, command] of Object.entries(hooks)) {
    const isValid = isValidGitHook(hookName);
    const status = isValid ? "✓" : "⚠";
    consola.info(`  ${status} ${hookName}: ${command}`);
  }
}

function generateHookScript(command: string): string {
  return `#!/bin/sh
# Generated by @funish/basis

${command}
`;
}
