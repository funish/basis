import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { consola } from "consola";
import micromatch from "micromatch";
import { resolve } from "pathe";
import type { CommitMessage, LintConfig } from "../types";
import { loadConfig } from "../utils";

// Default commit types
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
 * Parse commit message
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
 * Validate commit message
 */
export function validateCommitMessage(
  message: string,
  config: LintConfig["commitMsg"] = {},
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
 * Get staged files
 */
export function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only", {
      encoding: "utf8",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Lint staged files
 */
export async function lintStaged(
  cwd = process.cwd(),
  config?: LintConfig["staged"],
): Promise<boolean> {
  // Load config with c12 smart merging - config parameter overrides file config
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { staged: config } } : undefined,
  });
  const stagedConfig = loadedConfig.lint?.staged || {};

  const files = getStagedFiles();

  if (files.length === 0) {
    consola.info("No staged files to lint");
    return true;
  }

  if (Object.keys(stagedConfig).length === 0) {
    consola.warn("No staged lint configuration found");
    return true;
  }

  let hasErrors = false;
  const processedFiles = new Set<string>();

  for (const [pattern, command] of Object.entries(stagedConfig)) {
    // Filter files that haven't been processed and match the pattern (using basename)
    const matchedFiles = files.filter(
      (file) =>
        !processedFiles.has(file) &&
        micromatch.isMatch(file.split("/").pop() || file, pattern),
    );

    if (matchedFiles.length === 0) continue;

    consola.start(`Linting ${matchedFiles.length} files: ${pattern}`);

    try {
      const fullCommand = `${command} ${matchedFiles.join(" ")}`;
      execSync(fullCommand, {
        stdio: "inherit",
        cwd: cwd,
      });

      // Re-stage the linted files after potential modifications
      execSync(`git add ${matchedFiles.join(" ")}`, {
        stdio: "inherit",
        cwd: cwd,
      });

      // Mark files as processed to avoid duplicate processing
      matchedFiles.forEach((file) => processedFiles.add(file));

      consola.success(`✓ ${pattern}`);
    } catch (error) {
      hasErrors = true;
      consola.error(`✗ ${pattern} failed:`, error);
    }
  }

  return !hasErrors;
}

/**
 * Lint commit message
 */
export async function lintCommitMessage(
  cwd = process.cwd(),
  config?: LintConfig["commitMsg"],
): Promise<boolean> {
  // Load config with c12 smart merging - config parameter overrides file config
  const { config: loadedConfig } = await loadConfig({
    cwd,
    overrides: config ? { lint: { commitMsg: config } } : undefined,
  });
  const commitMsgConfig = loadedConfig.lint?.commitMsg || {};

  let message: string;

  try {
    // Read from Git's standard commit message file
    const commitMsgPath = resolve(".git/COMMIT_EDITMSG");
    if (existsSync(commitMsgPath)) {
      message = readFileSync(commitMsgPath, "utf8");
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
