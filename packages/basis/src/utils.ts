import { access } from "node:fs/promises";
import { loadConfig as _loadConfig, type LoadConfigOptions } from "c12";
import { defaultConfig } from "./config";
import type { BasisConfig } from "./types";

export async function loadConfig(options: LoadConfigOptions<BasisConfig> = {}) {
  return await _loadConfig<BasisConfig>({
    name: "basis",
    cwd: process.cwd(),
    ...options,
    // Ensure defaults is always merged with our defaultConfig
    defaults: { ...defaultConfig, ...options.defaults },
  });
}

/**
 * Check if file or directory exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get package manager specific commands
 */
export function getPackageManagerCommands(packageManager: string) {
  switch (packageManager) {
    case "yarn":
      return {
        outdated: "yarn outdated --json",
        audit: "yarn audit --level moderate",
        execPrefix: "yarn exec",
        remove: "yarn remove",
        update: "yarn upgrade",
        auditFix: "yarn upgrade",
      };
    case "pnpm":
      return {
        outdated: "pnpm outdated --format table",
        audit: "pnpm audit --audit-level moderate",
        execPrefix: "pnpm exec",
        remove: "pnpm remove",
        update: "pnpm update",
        auditFix: "pnpm audit --fix",
      };
    case "bun":
      return {
        outdated: "bun outdated",
        audit: null,
        execPrefix: "bunx",
        remove: "bun remove",
        update: "bun update",
        auditFix: null,
      };
    case "deno":
      return {
        outdated: null,
        audit: null,
        execPrefix: "deno task",
        remove: null,
        update: null,
        auditFix: null,
      };
    default: // npm
      return {
        outdated: "npm outdated --json",
        audit: "npm audit --audit-level moderate",
        execPrefix: "npx",
        remove: "npm uninstall",
        update: "npm update",
        auditFix: "npm audit fix",
      };
  }
}
