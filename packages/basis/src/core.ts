import { setupGit } from "./modules/git";
import { init as initProject } from "./modules/init";
import { lintAll } from "./modules/lint";
import { publishPackage } from "./modules/publish";
import { updatePackageVersion } from "./modules/version";
import type { BasisConfig, InitOptions, PublishOptions, VersionOptions } from "./types";
import { loadConfig } from "./utils";

/**
 * Basis core utilities for programmatic usage
 * Only includes methods that provide actual value beyond simple function calls
 */
export class Basis {
  private config: BasisConfig | null = null;
  private cwd: string;

  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Get current working directory
   */
  getCwd(): string {
    return this.cwd;
  }

  /**
   * Set working directory and reset cached config
   */
  setCwd(cwd: string): void {
    this.cwd = cwd;
    this.config = null; // Reset cached config
  }

  /**
   * Load configuration from file or cache
   */
  async getConfig(): Promise<BasisConfig> {
    if (!this.config) {
      const { config } = await loadConfig({ cwd: this.cwd });
      this.config = config;
    }
    return this.config;
  }

  /**
   * Reload configuration from file
   */
  async reloadConfig(): Promise<BasisConfig> {
    this.config = null;
    return await this.getConfig();
  }

  /**
   * Run complete project setup (init + git setup)
   */
  async setup(options: InitOptions = {}): Promise<boolean> {
    const initSuccess = await initProject(this.cwd, options);
    if (!initSuccess) return false;

    const gitSuccess = await setupGit(this.cwd);
    return gitSuccess;
  }

  /**
   * Run complete release workflow (lint + version + publish)
   */
  async release(versionOptions: VersionOptions = {}, publishOptions: PublishOptions = {}) {
    // Run all lint checks first
    const lintSuccess = await lintAll(this.cwd);
    if (!lintSuccess) {
      throw new Error("Lint checks failed. Fix issues before releasing.");
    }

    // Update version
    const versionResult = await updatePackageVersion(this.cwd, versionOptions);

    // Publish package
    const publishResult = await publishPackage(this.cwd, publishOptions);

    return {
      version: versionResult,
      publish: publishResult,
    };
  }
}

/**
 * Create a new Basis instance
 */
export function createBasis(cwd = process.cwd()): Basis {
  return new Basis(cwd);
}
