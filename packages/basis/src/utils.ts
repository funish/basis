import { loadConfig as _loadConfig, type LoadConfigOptions } from "c12";
import { findWorkspaceDir } from "pkg-types";
import { dirname } from "pathe";
import type { BasisConfig } from "./types";

/**
 * Load Basis configuration with intelligent upward search
 */
export async function loadConfig(options: LoadConfigOptions<BasisConfig> = {}) {
  // If user explicitly passed cwd, respect their intent
  if (options.cwd) {
    return await _loadConfig({
      name: "basis",
      cwd: options.cwd,
      ...options,
      defaults: {
        ...options.defaults,
      },
    });
  }

  // No explicit cwd: intelligently search upward
  let cwd = process.cwd();
  const workspaceRoot = await findWorkspaceDir(cwd);

  // Search upward from current directory to workspace root
  while (true) {
    const result = await _loadConfig({
      name: "basis",
      cwd,
      ...options,
      defaults: {
        ...options.defaults,
      },
    });

    // If config file is found (_configFile exists), return it
    if (result._configFile) {
      return result;
    }

    // Reached workspace root, return the result even if no config found
    if (cwd === workspaceRoot) {
      return result;
    }

    // Move up one directory
    cwd = dirname(cwd);
  }
}
