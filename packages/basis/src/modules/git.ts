import { execSync } from "node:child_process";
import { copyFile, readFile, unlink, writeFile } from "node:fs/promises";
import { updateConfig } from "c12/update";
import { consola } from "consola";
import { defu } from "defu";
import ini from "ini";
import { resolve } from "pathe";
import type {
  BasisConfig,
  CommitMessage,
  GitConfig,
  GitConfigData,
  GitConfigSection,
} from "../types";
import { fileExists, loadConfig } from "../utils";

/**
 * Check if git command is available
 */
function isGitAvailable(): boolean {
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove git configuration from basis config
 */
async function removeGitFromBasisConfig(
  cwd: string,
  removeHooks = false,
  removeConfig = false,
): Promise<boolean> {
  try {
    await updateConfig({
      cwd,
      configFile: "basis.config",
      onUpdate: (config: BasisConfig) => {
        if (config.git) {
          if (removeHooks && config.git.hooks) {
            delete config.git.hooks;
          }

          if (removeConfig && config.git.config) {
            delete config.git.config;
          }

          // Remove entire git section if empty
          if (Object.keys(config.git).length === 0) {
            delete config.git;
          }
        }
      },
    });
    return true;
  } catch {
    return false;
  }
}

// Default commit types following conventional commits
const DEFAULT_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

/**
 * Parse commit message into structured format
 */
export function parseCommitMessage(message: string): CommitMessage | null {
  const lines = message.trim().split("\n");
  const header = lines[0];

  // Match type(scope): description or type: description
  const headerMatch = header.match(/^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)$/);

  if (!headerMatch) {
    return null;
  }

  const [, type, , scope, breaking, description] = headerMatch;
  const body = lines
    .slice(1)
    .find((line) => line.trim())
    ?.trim();
  const footer = lines.slice(-1)[0]?.trim();

  return {
    type,
    scope,
    description,
    body,
    footer,
    isBreaking: !!breaking || message.includes("BREAKING CHANGE:"),
  };
}

/**
 * Validate commit message against rules
 */
export function validateCommitMessage(
  message: string,
  config: GitConfig["commitMsg"] = {},
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const {
    types = DEFAULT_TYPES,
    maxLength = 72,
    minLength = 10,
    scopeRequired = false,
    allowedScopes = [],
  } = config;

  const parsed = parseCommitMessage(message);

  if (!parsed) {
    return {
      valid: false,
      errors: ["Invalid commit format. Expected: type(scope): description"],
    };
  }

  // Check type
  if (!types.includes(parsed.type)) {
    errors.push(`Invalid type '${parsed.type}'. Allowed: ${types.join(", ")}`);
  }

  // Check length
  const header = message.split("\n")[0];
  if (header.length > maxLength) {
    errors.push(`Header too long (${header.length}). Max: ${maxLength}`);
  }

  if (header.length < minLength) {
    errors.push(`Header too short (${header.length}). Min: ${minLength}`);
  }

  // Check scope
  if (scopeRequired && !parsed.scope) {
    errors.push("Scope is required");
  }

  if (
    parsed.scope &&
    allowedScopes.length > 0 &&
    !allowedScopes.includes(parsed.scope)
  ) {
    errors.push(
      `Invalid scope '${parsed.scope}'. Allowed: ${allowedScopes.join(", ")}`,
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Lint commit message from Git
 */
export async function lintCommitMessage(
  cwd = process.cwd(),
  config?: GitConfig["commitMsg"],
): Promise<boolean> {
  // Check if git is available
  if (!isGitAvailable()) {
    consola.warn("Git command not available, skipping commit message linting");
    return true; // Skip linting if git is not available
  }

  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { git: { commitMsg: config } } : undefined,
  });
  const commitMsgConfig = loadedConfig.git?.commitMsg || {};

  let message: string;

  try {
    // Read from Git's standard commit message file
    const commitMsgPath = resolve(".git/COMMIT_EDITMSG");
    if (await fileExists(commitMsgPath)) {
      const buffer = await readFile(commitMsgPath);
      message = buffer.toString("utf8");
    } else {
      // Fallback: get last commit message
      const lastCommit = execSync("git log -1 --pretty=%B", {
        encoding: "utf8",
      });
      message = lastCommit.trim();
    }
  } catch (error) {
    consola.error("Failed to read commit message:", error);
    return false;
  }

  const result = validateCommitMessage(message, commitMsgConfig);

  if (!result.valid) {
    consola.error("Invalid commit message:");
    result.errors.forEach((error) => consola.error(`  ${error}`));
    return false;
  }

  return true;
}

/**
 * Create backup of Git configuration
 */
async function createGitConfigBackup(cwd: string): Promise<string | null> {
  const gitConfigPath = resolve(cwd, ".git/config");

  if (!(await fileExists(gitConfigPath))) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = resolve(cwd, `.git/config.backup.${timestamp}`);

  try {
    await copyFile(gitConfigPath, backupPath);
    return backupPath;
  } catch (error) {
    consola.warn("Failed to create Git config backup:", error);
    return null;
  }
}

/**
 * Read Git configuration from .git/config using ini parser
 */
export async function readGitConfig(
  cwd = process.cwd(),
): Promise<GitConfigData> {
  const gitConfigPath = resolve(cwd, ".git/config");

  if (!(await fileExists(gitConfigPath))) {
    return {};
  }

  try {
    const content = await readFile(gitConfigPath, "utf8");
    const parsed = ini.parse(content);
    return parsed;
  } catch (error) {
    consola.warn("Failed to read .git/config:", error);
    return {};
  }
}

/**
 * Write Git configuration to .git/config using ini format
 */
export async function writeGitConfig(
  config: GitConfigData,
  cwd = process.cwd(),
): Promise<void> {
  const gitConfigPath = resolve(cwd, ".git/config");

  try {
    // Generate ini with proper spacing
    let content = ini.stringify(config, {
      whitespace: true,
    });

    // Convert to Git's preferred format with tab indentation
    content = content
      .split("\n")
      .map((line) => {
        // If line starts with a key (not section header), add tab indentation
        if (line && !line.startsWith("[") && line.includes("=")) {
          return `\t${line}`;
        }
        return line;
      })
      .join("\n");

    await writeFile(gitConfigPath, content, "utf8");
  } catch (error) {
    consola.error("Failed to write .git/config:", error);
    throw error;
  }
}

/**
 * Check if config values already exist in Git config
 */
function isConfigUpToDate(
  existingConfig: GitConfigData,
  ourConfig: GitConfig["config"],
): boolean {
  if (!ourConfig) return true;

  for (const [section, sectionConfig] of Object.entries(ourConfig)) {
    if (typeof sectionConfig !== "object" || !sectionConfig) continue;

    const existingSection = existingConfig[section];
    if (!existingSection || typeof existingSection !== "object") {
      return false; // Section doesn't exist
    }

    for (const [key, value] of Object.entries(sectionConfig)) {
      if (value !== undefined && existingSection[key] !== value) {
        return false; // Value differs or doesn't exist
      }
    }
  }

  return true; // All our values are already present and match
}

/**
 * Setup Git configuration with backup and safe merging
 */
export async function setupGitConfig(
  cwd = process.cwd(),
  config?: GitConfig["config"],
): Promise<boolean> {
  // Check if git is available
  if (!isGitAvailable()) {
    consola.warn("Git command not available, skipping Git config setup");
    return true; // Skip setup if git is not available
  }

  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { git: { config: config } } : undefined,
  });
  const gitConfigSettings = loadedConfig.git?.config || {};

  // If no settings to apply, skip
  if (Object.keys(gitConfigSettings).length === 0) {
    return true;
  }

  try {
    // Read existing configuration
    const existingConfig = await readGitConfig(cwd);

    // Check if our configuration values are already applied
    if (isConfigUpToDate(existingConfig, gitConfigSettings)) {
      return true;
    }

    // Create backup before making changes (only when actually needed)
    await createGitConfigBackup(cwd);

    // Use defu to merge configurations (existing has priority)
    const mergedConfig = defu(existingConfig, gitConfigSettings);

    // Write merged configuration
    await writeGitConfig(mergedConfig, cwd);

    return true;
  } catch (error) {
    consola.error("Failed to setup Git configuration:", error);
    return false;
  }
}

/**
 * Reset Git configuration with backup
 */
export async function resetGitConfig(
  cwd = process.cwd(),
  keepUser = true,
  options: { updateConfig?: boolean } = {},
): Promise<boolean> {
  // Check if git is available
  if (!isGitAvailable()) {
    consola.warn("Git command not available, skipping Git config reset");
    return true; // Skip reset if git is not available
  }

  try {
    // Create backup before resetting
    await createGitConfigBackup(cwd);

    const existingConfig = await readGitConfig(cwd);

    if (!existingConfig || Object.keys(existingConfig).length === 0) {
      return true;
    }

    // Start with empty config
    const resetConfig: GitConfigData = {};

    // Keep user information if requested
    if (keepUser && existingConfig.user) {
      resetConfig.user = existingConfig.user;
    }

    // Keep core Git settings that shouldn't be removed
    if (existingConfig.core) {
      const preservedCoreSettings = [
        "repositoryformatversion",
        "filemode",
        "bare",
        "logallrefupdates",
      ];
      const preservedCore: GitConfigSection = {};

      preservedCoreSettings.forEach((setting) => {
        if (existingConfig.core[setting] !== undefined) {
          preservedCore[setting] = existingConfig.core[setting];
        }
      });

      if (Object.keys(preservedCore).length > 0) {
        resetConfig.core = preservedCore;
      }
    }

    await writeGitConfig(resetConfig, cwd);

    // Update basis.config.ts if requested
    if (options.updateConfig) {
      const configSuccess = await removeGitFromBasisConfig(cwd, false, true);
      return configSuccess;
    }

    return true;
  } catch (error) {
    consola.error("Failed to reset Git configuration:", error);
    return false;
  }
}

/**
 * Setup Git hooks
 */
export async function setupGitHooks(
  cwd = process.cwd(),
  config?: GitConfig["hooks"],
): Promise<boolean> {
  // Check if git is available
  if (!isGitAvailable()) {
    consola.warn("Git command not available, skipping Git hooks setup");
    return true; // Skip setup if git is not available
  }

  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { git: { hooks: config } } : undefined,
  });
  const hooksConfig = loadedConfig.git?.hooks || {};

  const hooksDir = resolve(cwd, ".git/hooks");

  if (!(await fileExists(hooksDir))) {
    consola.error("Git hooks directory not found. Is this a Git repository?");
    return false;
  }

  let success = true;

  // Setup each configured hook
  for (const [hookName, hookConfig] of Object.entries(hooksConfig)) {
    const hookPath = resolve(hooksDir, hookName);

    try {
      let hookContent = "#!/bin/sh\n\n";

      if (typeof hookConfig === "string") {
        // Simple command string
        hookContent += `${hookConfig}\n`;
      } else if (
        hookConfig &&
        typeof hookConfig === "object" &&
        "commands" in hookConfig
      ) {
        // Multiple commands
        const commands = (hookConfig as { commands: string[] }).commands;
        hookContent += `${commands.join("\n")}\n`;
      }

      await writeFile(hookPath, hookContent, { mode: 0o755 });
    } catch (error) {
      consola.error(`Failed to setup ${hookName} hook:`, error);
      success = false;
    }
  }

  return success;
}

/**
 * Initialize Git repository
 */
export async function initGitRepo(cwd = process.cwd()): Promise<boolean> {
  // Check if git is available
  if (!isGitAvailable()) {
    consola.warn("Git command not available, cannot initialize repository");
    return false;
  }

  try {
    // Check if already a Git repository
    try {
      execSync("git rev-parse --git-dir", { cwd, stdio: "pipe" });
      return true;
    } catch {
      // Initialize Git repository
      execSync("git init", { cwd, stdio: "inherit" });
      consola.success("Initialized Git repository");
      return true;
    }
  } catch (error) {
    consola.error("Failed to initialize Git repository:", error);
    return false;
  }
}

/**
 * Run comprehensive Git setup
 */
export async function setupGit(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig({ cwd });
  const gitConfig = config.git || {};

  const results = await Promise.allSettled([
    setupGitConfig(cwd, gitConfig.config),
    setupGitHooks(cwd, gitConfig.hooks),
  ]);

  const failures = results.filter(
    (result) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" && !result.value),
  );

  if (failures.length === 0) {
    // Final success message - users need to know setup completed
    consola.success("Git setup completed successfully!");
    return true;
  }

  consola.error(`${failures.length} Git setup step(s) failed`);
  return false;
}

/**
 * Remove Git hooks
 */
export async function removeGitHooks(
  cwd = process.cwd(),
  hooksToRemove?: string[],
  options: { updateConfig?: boolean } = {},
): Promise<boolean> {
  // Check if git is available
  if (!isGitAvailable()) {
    consola.warn("Git command not available, skipping Git hooks removal");
    return true; // Skip removal if git is not available
  }

  const hooksDir = resolve(cwd, ".git/hooks");

  if (!(await fileExists(hooksDir))) {
    consola.warn("Git hooks directory not found. Is this a Git repository?");
    return true; // Consider it successful if no hooks dir exists
  }

  let success = true;

  // Determine which hooks to remove
  let hooksToDelete: string[];
  if (hooksToRemove && hooksToRemove.length > 0) {
    hooksToDelete = hooksToRemove;
  } else {
    const { config } = await loadConfig({ cwd });
    hooksToDelete = Object.keys(config.git?.hooks || {});
  }

  // Remove hooks
  for (const hookName of hooksToDelete) {
    const hookPath = resolve(hooksDir, hookName);

    if (await fileExists(hookPath)) {
      try {
        await unlink(hookPath);
      } catch (error) {
        consola.error(`Failed to remove ${hookName} hook:`, error);
        success = false;
      }
    }
  }

  // Update basis.config.ts if removing all hooks and requested
  if (!hooksToRemove && options.updateConfig) {
    const configSuccess = await removeGitFromBasisConfig(cwd, true, false);
    success = success && configSuccess;
  }

  return success;
}
