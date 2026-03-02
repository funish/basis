import { loadConfig as _loadConfig, type LoadConfigOptions } from "c12";
import type { BasisConfig } from "./types";

/**
 * Define a Basis configuration
 */
export function defineBasisConfig(config: BasisConfig): BasisConfig {
  return config;
}

/**
 * Load Basis configuration
 */
export async function loadConfig(options: LoadConfigOptions<BasisConfig> = {}) {
  return await _loadConfig({
    name: "basis",
    cwd: process.cwd(),
    ...options,
    defaults: {
      ...options.defaults,
    },
  });
}

export { defineBuildConfig } from "@funish/build/config";
