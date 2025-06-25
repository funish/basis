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
