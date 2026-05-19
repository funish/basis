import { readFile, writeFile, mkdir } from "node:fs/promises";

import { consola } from "consola";
import { execa } from "execa";
import { relative, resolve } from "pathe";

import { loadConfig } from "../utils";

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
 * Validate commit message (called by commit-msg hook)
 */
export async function lintCommitMessage(cwd = process.cwd()): Promise<boolean> {
  const { config } = await loadConfig();
  const commitMsgConfig = config.git?.commitMsg;

  const types = commitMsgConfig?.types || DEFAULT_TYPES;
  const maxLength = commitMsgConfig?.maxLength || 72;
  const minLength = commitMsgConfig?.minLength || 10;
  const scopeRequired = commitMsgConfig?.scopeRequired || false;
  const allowedScopes = commitMsgConfig?.allowedScopes || [];

  let message: string;

  try {
    const commitMsgPath = resolve(cwd, ".git/COMMIT_EDITMSG");
    try {
      const buffer = await readFile(commitMsgPath);
      message = buffer.toString("utf8");
    } catch {
      // Fallback: get last commit message
      const result = await execa("git", ["log", "-1", "--pretty=%B"], { cwd });
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

  if (!types.includes(parsed.type)) {
    errors.push(`Invalid type '${parsed.type}'. Allowed: ${types.join(", ")}`);
  }

  const header = message.split("\n")[0];
  if (header.length > maxLength) {
    errors.push(`Header too long (${header.length} chars). Max: ${maxLength}`);
  }

  if (header.length < minLength) {
    errors.push(`Header too short (${header.length} chars). Min: ${minLength}`);
  }

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
 * Install commit-msg hook for commit message validation.
 * Respects git core.hooksPath (e.g. set by `vp config`).
 *
 * When hooksPath is set (e.g. `.vite-hooks/_`), Vite+ uses a wrapper pattern:
 * - `.vite-hooks/_/commit-msg` → wrapper that sources `h` helper
 * - `.vite-hooks/commit-msg` → actual user hook content
 * We write the user hook to the parent directory of hooksPath.
 */
export async function setupHooks(cwd = process.cwd()): Promise<boolean> {
  try {
    // Resolve hooksPath: respect core.hooksPath, fallback to .git/hooks
    let hooksPath: string;
    try {
      const { stdout } = await execa("git", ["config", "core.hooksPath"], { cwd });
      const configured = stdout.trim();
      if (configured) {
        // Vite+ pattern: hooksPath ends with /_, user hooks go in parent dir
        hooksPath = resolve(cwd, configured.replace(/\/_$/, ""));
      } else {
        hooksPath = resolve(cwd, ".git/hooks");
      }
    } catch {
      hooksPath = resolve(cwd, ".git/hooks");
    }

    await mkdir(hooksPath, { recursive: true });

    // Install commit-msg hook
    const hookFilePath = resolve(hooksPath, "commit-msg");
    const hookContent = `basis git lint-commit\n`;

    await writeFile(hookFilePath, hookContent, { mode: 0o755 });
    consola.success(
      `Installed commit-msg hook at ${relative(cwd, hookFilePath).replace(/\\/g, "/")}`,
    );
    return true;
  } catch (error) {
    consola.error("Failed to setup hooks:", error);
    return false;
  }
}
