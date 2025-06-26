import { execSync } from "node:child_process";
import { copyFile, readFile, unlink, writeFile } from "node:fs/promises";
import { consola } from "consola";
import ini from "ini";
import { generateCode, parseModule } from "magicast";
import { resolve } from "pathe";
import type {
  CommitMessage,
  GitConfig,
  GitConfigData,
  GitConfigSection,
} from "../types";
import { fileExists, loadConfig } from "../utils";

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
    consola.error("✗ Failed to read commit message:", error);
    return false;
  }

  const result = validateCommitMessage(message, commitMsgConfig);

  if (!result.valid) {
    consola.error("✗ Invalid commit message:");
    result.errors.forEach((error) => consola.error(`  ${error}`));
    return false;
  }

  consola.success("✓ Commit message is valid");
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
    consola.info(`📄 Created backup: ${backupPath}`);
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
    consola.info("No .git/config found, will create new one");
    return {};
  }

  try {
    const content = await readFile(gitConfigPath, "utf8");
    const parsed = ini.parse(content);
    consola.success(`✓ Read existing Git configuration from ${gitConfigPath}`);
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
    consola.success(`✓ Git configuration written to ${gitConfigPath}`);
  } catch (error) {
    consola.error("Failed to write .git/config:", error);
    throw error;
  }
}

/**
 * Convert nested GitConfig to flat ini format for merging
 */
function convertToIniFormat(config: GitConfig["config"]): GitConfigData {
  const result: GitConfigData = {};

  if (!config) return result;

  Object.entries(config).forEach(([section, sectionConfig]) => {
    if (typeof sectionConfig === "object" && sectionConfig !== null) {
      // Create section object if it doesn't exist
      if (!result[section]) {
        result[section] = {};
      }

      // Add each setting to the section
      Object.entries(sectionConfig).forEach(([key, value]) => {
        if (value !== undefined) {
          result[section][key] = value;
        }
      });
    }
  });

  return result;
}

/**
 * Safely merge Git configurations
 */
function mergeGitConfigs(
  existing: GitConfigData,
  newConfig: GitConfigData,
): GitConfigData {
  const merged = { ...existing };

  Object.entries(newConfig).forEach(([section, sectionConfig]) => {
    if (typeof sectionConfig === "object" && sectionConfig !== null) {
      // Ensure section exists
      if (!merged[section]) {
        merged[section] = {};
      }

      // Merge section settings
      Object.entries(sectionConfig).forEach(([key, value]) => {
        if (value !== undefined) {
          merged[section][key] = value;
          consola.info(`🔧 Setting ${section}.${key} = ${value}`);
        }
      });
    }
  });

  return merged;
}

/**
 * Setup Git configuration with backup and safe merging
 */
export async function setupGitConfig(
  cwd = process.cwd(),
  config?: GitConfig["config"],
): Promise<boolean> {
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { git: { config: config } } : undefined,
  });
  const gitConfigSettings = loadedConfig.git?.config || {};

  // If no settings to apply, skip
  if (Object.keys(gitConfigSettings).length === 0) {
    consola.info("No Git configuration settings to apply");
    return true;
  }

  try {
    // Create backup before making changes
    const backupPath = await createGitConfigBackup(cwd);

    // Read existing configuration
    const existingConfig = await readGitConfig(cwd);

    // Convert basis config to ini format
    const newConfigIni = convertToIniFormat(gitConfigSettings);

    // Safely merge configurations
    const mergedConfig = mergeGitConfigs(existingConfig, newConfigIni);

    // Write merged configuration
    await writeGitConfig(mergedConfig, cwd);

    consola.success("✓ Git configuration setup completed");
    if (backupPath) {
      consola.info(
        `💾 Original config backed up to: ${backupPath.split("/").pop()}`,
      );
    }

    return true;
  } catch (error) {
    consola.error("✗ Failed to setup Git configuration:", error);
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
  try {
    // Create backup before resetting
    const backupPath = await createGitConfigBackup(cwd);

    const existingConfig = await readGitConfig(cwd);

    if (!existingConfig || Object.keys(existingConfig).length === 0) {
      consola.info("No Git configuration found to reset");
      return true;
    }

    // Start with empty config
    const resetConfig: GitConfigData = {};

    // Keep user information if requested
    if (keepUser && existingConfig.user) {
      resetConfig.user = existingConfig.user;
      consola.info("🔒 Keeping user configuration (name, email)");
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
        consola.info("🔒 Keeping essential core Git settings");
      }
    }

    await writeGitConfig(resetConfig, cwd);
    consola.success("✓ Git configuration reset completed");

    if (backupPath) {
      consola.info(
        `💾 Original config backed up to: ${backupPath.split("/").pop()}`,
      );
    }

    // Update basis.config.ts if requested
    if (options.updateConfig) {
      const configSuccess = await updateBasisConfig(cwd, false, true);
      return configSuccess;
    }

    return true;
  } catch (error) {
    consola.error("✗ Failed to reset Git configuration:", error);
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
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { git: { hooks: config } } : undefined,
  });
  const hooksConfig = loadedConfig.git?.hooks || {};

  const hooksDir = resolve(cwd, ".git/hooks");

  if (!(await fileExists(hooksDir))) {
    consola.error("✗ Git hooks directory not found. Is this a Git repository?");
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
      consola.success(`✓ Setup ${hookName} hook`);
    } catch (error) {
      consola.error(`✗ Failed to setup ${hookName} hook:`, error);
      success = false;
    }
  }

  return success;
}

/**
 * Initialize Git repository with basis configuration
 */
export async function initGitRepo(cwd = process.cwd()): Promise<boolean> {
  try {
    // Check if already a Git repository
    try {
      execSync("git rev-parse --git-dir", { cwd, stdio: "pipe" });
      consola.info("Git repository already exists");
    } catch {
      // Initialize Git repository
      execSync("git init", { cwd, stdio: "inherit" });
      consola.success("✓ Initialized Git repository");
    }

    // Setup Git configuration and hooks
    const configSuccess = await setupGitConfig(cwd);
    const hooksSuccess = await setupGitHooks(cwd);

    return configSuccess && hooksSuccess;
  } catch (error) {
    consola.error("✗ Failed to initialize Git repository:", error);
    return false;
  }
}

/**
 * Run comprehensive Git setup
 */
export async function setupGit(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig({ cwd });
  const gitConfig = config.git || {};

  consola.start("Setting up Git configuration...");

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
    consola.success("✅ Git setup completed successfully!");
    return true;
  }

  consola.error(`❌ ${failures.length} Git setup step(s) failed`);
  return false;
}

/**
 * Update basis.config.ts to remove git configuration
 */
async function updateBasisConfig(
  cwd: string,
  removeHooks = false,
  removeConfig = false,
): Promise<boolean> {
  const configPath = resolve(cwd, "basis.config.ts");

  if (!(await fileExists(configPath))) {
    consola.info("No basis.config.ts found to update");
    return true;
  }

  try {
    const content = await readFile(configPath, "utf8");
    const mod = parseModule(content);

    // Find the config object
    const defaultExport = mod.exports.default;
    if (!defaultExport || !defaultExport.$args?.[0]) {
      consola.warn("Could not parse basis.config.ts structure");
      return false;
    }

    const config = defaultExport.$args[0];

    if (config.git) {
      if (removeHooks && config.git.hooks) {
        delete config.git.hooks;
        consola.success("✓ Removed hooks configuration from basis.config.ts");
      }

      if (removeConfig && config.git.config) {
        delete config.git.config;
        consola.success("✓ Removed git config from basis.config.ts");
      }

      // Remove entire git section if empty
      if (Object.keys(config.git).length === 0) {
        delete config.git;
        consola.success("✓ Removed empty git section from basis.config.ts");
      }
    }

    const { code } = generateCode(mod);
    await writeFile(configPath, code, "utf8");
    return true;
  } catch (error) {
    consola.error("✗ Failed to update basis.config.ts:", error);
    return false;
  }
}

/**
 * Remove Git hooks
 */
export async function removeGitHooks(
  cwd = process.cwd(),
  hooksToRemove?: string[],
  options: { updateConfig?: boolean } = {},
): Promise<boolean> {
  const hooksDir = resolve(cwd, ".git/hooks");

  if (!(await fileExists(hooksDir))) {
    consola.warn("Git hooks directory not found. Is this a Git repository?");
    return true; // Consider it successful if no hooks dir exists
  }

  let success = true;

  if (hooksToRemove && hooksToRemove.length > 0) {
    // Remove specific hooks
    for (const hookName of hooksToRemove) {
      const hookPath = resolve(hooksDir, hookName);

      if (await fileExists(hookPath)) {
        try {
          await unlink(hookPath);
          consola.success(`✓ Removed ${hookName} hook`);
        } catch (error) {
          consola.error(`✗ Failed to remove ${hookName} hook:`, error);
          success = false;
        }
      }
    }
  } else {
    // Remove all basis-managed hooks (read from config)
    const { config } = await loadConfig({ cwd });
    const hooksConfig = config.git?.hooks || {};

    for (const hookName of Object.keys(hooksConfig)) {
      const hookPath = resolve(hooksDir, hookName);

      if (await fileExists(hookPath)) {
        try {
          await unlink(hookPath);
          consola.success(`✓ Removed ${hookName} hook`);
        } catch (error) {
          consola.error(`✗ Failed to remove ${hookName} hook:`, error);
          success = false;
        }
      }
    }

    // Update basis.config.ts if requested
    if (options.updateConfig) {
      const configSuccess = await updateBasisConfig(cwd, true, false);
      success = success && configSuccess;
    }
  }

  return success;
}
