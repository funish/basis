import type { InlineConfig } from "tsdown";
import type { PackageJson } from "pkg-types";

export interface BuildContext {
  pkgDir: string;
  pkg: PackageJson;
}

/**
 * Build entry configuration extending tsdown's InlineConfig
 * with the addition of stub mode support.
 */
export interface BuildEntry extends InlineConfig {
  /**
   * Generate Jiti stub for development instead of actual build.
   * When enabled, files will use Jiti to load source files at runtime.
   */
  stub?: boolean;
}

export interface BuildHooks {
  start?: (ctx: BuildContext) => void | Promise<void>;
  end?: (ctx: BuildContext) => void | Promise<void>;
}

export interface BuildConfig {
  cwd?: string | URL;
  entries: (BuildEntry | string)[];
  hooks?: BuildHooks;
}
