import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { exec, setupEnvironment } from "dugite";
import { consola } from "consola";
import picomatch from "picomatch";
import { resolve } from "pathe";
import type { StagedConfig } from "../types";
import { loadConfig } from "../utils";

/**
 * Setup Git environment using dugite's setupEnvironment
 * This ensures dugite can find the system Git or use embedded Git correctly
 */
export async function setupGitEnvironment() {
  try {
    // Try to find system Git installation directory
    // On Windows with Git for Windows, it's typically at C:/Program Files/Git
    // We can use git --exec-path to find it
    const gitExecPath = execSync("git --exec-path", { encoding: "utf8" }).trim();

    if (gitExecPath) {
      // git --exec-path returns something like C:/Program Files/Git/mingw64/libexec/git-core
      // We need to go up 3 levels to get the Git installation directory
      const gitDir = resolve(gitExecPath, "..", "..", "..");

      // Use dugite's setupEnvironment to configure the environment
      const result = setupEnvironment({
        LOCAL_GIT_DIRECTORY: gitDir,
      });

      // Update process.env with the configured environment
      Object.assign(process.env, result.env);

      consola.debug(`Using system Git from: ${result.gitLocation}`);
    }
  } catch {
    // System Git not found, dugite will use embedded Git
    consola.debug("System Git not found, dugite will use embedded Git");
  }
}

// Initialize Git environment on module load
void setupGitEnvironment();

/**
 * Get staged files (only existing files, not deleted ones)
 */
export async function getStagedFiles(cwd: string): Promise<string[]> {
  try {
    // Get all staged files including deleted ones
    const allStagedResult = await exec(["diff", "--cached", "--name-only"], cwd);
    const allStagedFiles = allStagedResult.stdout.trim().split("\n").filter(Boolean);

    // Get only deleted files
    const deletedResult = await exec(["diff", "--cached", "--name-only", "--diff-filter=D"], cwd);
    const deletedFiles = new Set(deletedResult.stdout.trim().split("\n").filter(Boolean));

    // Return only files that are not deleted
    return allStagedFiles.filter((file) => !deletedFiles.has(file));
  } catch {
    return [];
  }
}

/**
 * Lint staged files
 */
export async function lintStagedFiles(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig(); // Will automatically search upward
  const stagedConfig = config.git?.staged as StagedConfig | undefined;
  const rules = stagedConfig?.rules || {};

  if (Object.keys(rules).length === 0) {
    consola.warn("No staged rules configured. Add git.staged.rules to your basis.config.ts");
    return true;
  }

  const files = await getStagedFiles(cwd);

  if (files.length === 0) {
    consola.info("No staged files to check");
    return true;
  }

  consola.start(`Checking ${files.length} staged file(s)`);

  let hasErrors = false;
  const processedFiles = new Set<string>();

  for (const [pattern, commandConfig] of Object.entries(rules)) {
    // Match files against pattern
    const isMatch = picomatch(pattern);
    const matchedFiles = files.filter((file) => !processedFiles.has(file) && isMatch(file));

    if (matchedFiles.length === 0) continue;

    // Resolve commands from StagedCommand type
    let commands: string[];
    if (typeof commandConfig === "function") {
      const result = commandConfig(matchedFiles);
      commands = Array.isArray(result) ? result : [result];
    } else if (Array.isArray(commandConfig)) {
      commands = commandConfig;
    } else if (commandConfig.includes("{}")) {
      commands = [commandConfig.replace("{}", matchedFiles.join(" "))];
    } else {
      commands = [`${commandConfig} ${matchedFiles.join(" ")}`];
    }

    for (const command of commands) {
      consola.info(`Running ${command} for ${matchedFiles.length} file(s) matching ${pattern}`);

      try {
        // Get working directory status before format
        const beforeStatus = await exec(["status", "--porcelain"], cwd);
        const beforeModified = new Set<string>();

        beforeStatus.stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .forEach((line) => {
            // Git status --porcelain format: "XY filename" where XY are 2-char status code
            // X can be space for untracked files, so we match any 2 chars (space or non-space)
            const match = line.match(/^(..)\s+(.+)$/);
            if (!match) return;

            const [, status, filePath] = match;

            // Record files that were already modified in working directory (2nd char is M)
            if (status[1] === "M" || status === " M") {
              beforeModified.add(filePath);
            }
          });

        // Execute the external command
        execSync(command, {
          cwd,
          stdio: "inherit",
        });

        // Check for newly modified files after format (including indirectly modified ones)
        const afterStatus = await exec(["status", "--porcelain"], cwd);
        const filesToStage = new Set<string>();

        afterStatus.stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .forEach((line) => {
            // Git status --porcelain format: "XY filename" where XY are 2-char status code
            // X can be space for untracked files, so we match any 2 chars (space or non-space)
            const match = line.match(/^(..)\s+(.+)$/);
            if (!match) return;

            const [, status, filePath] = match;

            // Check if working directory file is modified (2nd char is M)
            if (status[1] === "M" || status === " M") {
              // If it's a matched file (was staged), always re-stage it
              if (matchedFiles.includes(filePath)) {
                filesToStage.add(filePath);
              }
              // If it's NOT a matched file, only stage if it's newly modified (by format tool)
              else if (!beforeModified.has(filePath)) {
                filesToStage.add(filePath);
              }
            }
          });

        // Re-stage files
        if (filesToStage.size > 0) {
          await exec(["add", ...Array.from(filesToStage)], cwd);
          consola.info(`Re-staged ${filesToStage.size} file(s) after formatting`);
        }
      } catch (error) {
        hasErrors = true;
        consola.error(`Staged check failed for pattern '${pattern}':`, error);
        break; // Stop processing remaining commands for this pattern
      }
    }

    // Only mark as processed if all commands succeeded
    if (!hasErrors) {
      matchedFiles.forEach((file) => processedFiles.add(file));
    }
  }

  if (hasErrors) {
    consola.error("Some staged files checks failed");
    return false;
  }

  consola.success("Staged files check passed");
  return true;
}

// Default commit types following conventional commits
export const DEFAULT_TYPES = [
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
export function parseCommitMessage(message: string): {
  type: string;
  scope?: string;
  subject?: string;
  isBreaking: boolean;
} | null {
  const lines = message.trim().split("\n");
  const header = lines[0];

  // Match type(scope): subject or type: subject
  const headerMatch = header.match(/^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)$/);

  if (!headerMatch) {
    return null;
  }

  const [, type, , scope, , subject] = headerMatch;

  return {
    type,
    scope,
    subject,
    isBreaking: header.includes("!") || message.includes("BREAKING CHANGE:"),
  };
}

/**
 * Validate commit message
 */
export async function lintCommitMessage(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig(); // Will automatically search upward
  const commitMsgConfig = config.git?.commitMsg;

  const types = commitMsgConfig?.types || DEFAULT_TYPES;
  const maxLength = commitMsgConfig?.maxLength || 72;
  const minLength = commitMsgConfig?.minLength || 10;
  const scopeRequired = commitMsgConfig?.scopeRequired || false;
  const allowedScopes = commitMsgConfig?.allowedScopes || [];

  let message: string;

  try {
    // Read from Git's standard commit message file
    const commitMsgPath = resolve(cwd, ".git/COMMIT_EDITMSG");
    try {
      const buffer = await readFile(commitMsgPath);
      message = buffer.toString("utf8");
    } catch {
      // Fallback: get last commit message
      const result = await exec(["log", "-1", "--pretty=%B"], cwd);
      message = result.stdout.trim();
    }
  } catch (error) {
    consola.error("Failed to read commit message:", error);
    return false;
  }

  const errors: string[] = [];
  const parsed = parseCommitMessage(message);

  if (!parsed) {
    consola.error("Invalid commit format. Expected: type(scope): subject");
    return false;
  }

  // Check type
  if (!types.includes(parsed.type)) {
    errors.push(`Invalid type '${parsed.type}'. Allowed: ${types.join(", ")}`);
  }

  // Check length
  const header = message.split("\n")[0];
  if (header.length > maxLength) {
    errors.push(`Header too long (${header.length} chars). Max: ${maxLength}`);
  }

  if (header.length < minLength) {
    errors.push(`Header too short (${header.length} chars). Min: ${minLength}`);
  }

  // Check scope
  if (scopeRequired && !parsed.scope) {
    errors.push("Scope is required");
  }

  if (parsed.scope && allowedScopes.length > 0 && !allowedScopes.includes(parsed.scope)) {
    errors.push(`Invalid scope '${parsed.scope}'. Allowed: ${allowedScopes.join(", ")}`);
  }

  if (errors.length > 0) {
    consola.error("Invalid commit message:");
    errors.forEach((error) => consola.error(`  ${error}`));
    return false;
  }

  consola.success("Commit message validation passed");
  return true;
}

/**
 * Setup Git hooks
 */
export async function setupGitHooks(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig(); // Will automatically search upward
  const hooks = config.git?.hooks;

  if (!hooks || Object.keys(hooks).length === 0) {
    consola.warn("No Git hooks configured");
    return true;
  }

  const hooksDir = resolve(cwd, ".git/hooks");

  try {
    for (const [hookName, hookCommand] of Object.entries(hooks)) {
      const hookPath = resolve(hooksDir, hookName);
      const hookContent = `#!/bin/sh\n${hookCommand}\n`;

      await writeFile(hookPath, hookContent, { mode: 0o755 });
      consola.success(`Created ${hookName} hook`);
    }

    return true;
  } catch (error) {
    consola.error("Failed to setup Git hooks:", error);
    return false;
  }
}

/**
 * Setup complete Git configuration (hooks + config)
 */
export async function setupGit(cwd = process.cwd()): Promise<boolean> {
  consola.start("Setting up Git configuration");

  const hooksResult = await setupGitHooks(cwd);

  if (hooksResult) {
    consola.success("Git setup completed");
    return true;
  }

  return false;
}
