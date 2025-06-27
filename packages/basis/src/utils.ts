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
      };
    case "pnpm":
      return {
        outdated: "pnpm outdated --format table",
        audit: "pnpm audit --audit-level moderate",
      };
    case "bun":
      return {
        outdated: "bun outdated",
        audit: null, // Bun doesn't have built-in audit command yet
      };
    case "deno":
      return {
        outdated: null, // Deno doesn't have traditional outdated check
        audit: null, // Deno doesn't have audit command
      };
    default: // npm
      return {
        outdated: "npm outdated --json",
        audit: "npm audit --audit-level moderate",
      };
  }
}
