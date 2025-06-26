import {
  initGitRepo,
  lintCommitMessage,
  removeGitHooks,
  resetGitConfig,
  setupGit,
  setupGitConfig,
  setupGitHooks,
} from "./modules/git";
import { init as initProject } from "./modules/init";
import {
  lintAll,
  lintDependencies,
  lintDocs,
  lintProject,
  lintStaged,
  lintStructure,
} from "./modules/lint";
import { publishPackage } from "./modules/publish";
import { updatePackageVersion } from "./modules/version";
import type {
  BasisConfig,
  InitOptions,
  PublishOptions,
  VersionOptions,
} from "./types";
import { loadConfig } from "./utils";

export class Basis {
  private config: BasisConfig | null = null;
  private cwd: string;

  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
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

  // ===============================================
  // Project Initialization
  // ===============================================

  /**
   * Initialize basis configuration in a project
   */
  async init(options: InitOptions = {}): Promise<boolean> {
    return await initProject(this.cwd, options);
  }

  // ===============================================
  // Linting Functions
  // ===============================================

  /**
   * Run linting for staged files
   */
  async lintStaged(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintStaged(this.cwd, config.lint?.staged);
  }

  /**
   * Run linting for entire project
   */
  async lintProject(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintProject(this.cwd, config.lint?.project);
  }

  /**
   * Check project dependencies
   */
  async lintDependencies(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintDependencies(this.cwd, config.lint?.dependencies);
  }

  /**
   * Check project structure
   */
  async lintStructure(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintStructure(this.cwd, config.lint?.structure);
  }

  /**
   * Check project documentation
   */
  async lintDocs(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintDocs(this.cwd, config.lint?.docs);
  }

  /**
   * Run all lint checks
   */
  async lintAll(): Promise<boolean> {
    return await lintAll(this.cwd);
  }

  // ===============================================
  // Git Functions
  // ===============================================

  /**
   * Validate commit message
   */
  async lintCommitMessage(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintCommitMessage(this.cwd, config.git?.commitMsg);
  }

  /**
   * Setup Git hooks
   */
  async setupGitHooks(): Promise<boolean> {
    const config = await this.getConfig();
    return await setupGitHooks(this.cwd, config.git?.hooks);
  }

  /**
   * Setup Git configuration
   */
  async setupGitConfig(): Promise<boolean> {
    const config = await this.getConfig();
    return await setupGitConfig(this.cwd, config.git?.config);
  }

  /**
   * Setup complete Git configuration (hooks + config)
   */
  async setupGit(): Promise<boolean> {
    return await setupGit(this.cwd);
  }

  /**
   * Initialize Git repository with basis configuration
   */
  async initGitRepo(): Promise<boolean> {
    return await initGitRepo(this.cwd);
  }

  /**
   * Remove Git hooks
   */
  async removeGitHooks(updateConfig = false): Promise<boolean> {
    return await removeGitHooks(this.cwd, undefined, { updateConfig });
  }

  /**
   * Reset Git configuration
   */
  async resetGitConfig(
    keepUser = true,
    updateConfig = false,
  ): Promise<boolean> {
    return await resetGitConfig(this.cwd, keepUser, { updateConfig });
  }

  // ===============================================
  // Version Management
  // ===============================================

  /**
   * Update package version
   */
  async updateVersion(options: VersionOptions = {}) {
    return await updatePackageVersion(this.cwd, options);
  }

  /**
   * Update to specific version
   */
  async setVersion(version: string) {
    return await updatePackageVersion(this.cwd, { version });
  }

  /**
   * Increment patch version
   */
  async patchVersion() {
    return await updatePackageVersion(this.cwd, { patch: true });
  }

  /**
   * Increment minor version
   */
  async minorVersion() {
    return await updatePackageVersion(this.cwd, { minor: true });
  }

  /**
   * Increment major version
   */
  async majorVersion() {
    return await updatePackageVersion(this.cwd, { major: true });
  }

  /**
   * Create prerelease version
   */
  async prereleaseVersion(preid?: string) {
    return await updatePackageVersion(this.cwd, { prerelease: true, preid });
  }

  // ===============================================
  // Publishing
  // ===============================================

  /**
   * Publish package to registry
   */
  async publish(options: PublishOptions = {}) {
    return await publishPackage(this.cwd, options);
  }

  /**
   * Publish with dry run
   */
  async publishDryRun(options: PublishOptions = {}) {
    return await publishPackage(this.cwd, { ...options, dryRun: true });
  }

  /**
   * Publish to specific tag
   */
  async publishToTag(tag: string, options: PublishOptions = {}) {
    return await publishPackage(this.cwd, { ...options, tag });
  }

  /**
   * Publish as stable release (latest tag)
   */
  async publishStable(options: PublishOptions = {}) {
    return await publishPackage(this.cwd, { ...options, stable: true });
  }

  // ===============================================
  // Utility Functions
  // ===============================================

  /**
   * Get current working directory
   */
  getCwd(): string {
    return this.cwd;
  }

  /**
   * Set working directory
   */
  setCwd(cwd: string): void {
    this.cwd = cwd;
    this.config = null; // Reset cached config
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
    const initSuccess = await this.init(options);
    if (!initSuccess) return false;

    const gitSuccess = await this.setupGit();
    return gitSuccess;
  }

  /**
   * Run complete release workflow (lint + version + publish)
   */
  async release(
    versionOptions: VersionOptions = {},
    publishOptions: PublishOptions = {},
  ) {
    // Run all lint checks first
    const lintSuccess = await this.lintAll();
    if (!lintSuccess) {
      throw new Error("Lint checks failed. Fix issues before releasing.");
    }

    // Update version
    const versionResult = await this.updateVersion(versionOptions);

    // Publish package
    const publishResult = await this.publish(publishOptions);

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
