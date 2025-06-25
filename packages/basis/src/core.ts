import { installHooks, listHooks, uninstallHooks } from "./modules/githooks";
import { init as initProject } from "./modules/init";
import { lintCommitMessage, lintStaged } from "./modules/lint";
import type { BasisConfig, InitOptions } from "./types";
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

  /**
   * Initialize basis configuration in a project
   */
  async init(options: InitOptions = {}): Promise<boolean> {
    return await initProject(this.cwd, options);
  }

  /**
   * Run linting for staged files
   */
  async lintStaged(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintStaged(this.cwd, config.lint?.staged);
  }

  /**
   * Run commit message linting
   */
  async lintCommitMessage(): Promise<boolean> {
    const config = await this.getConfig();
    return await lintCommitMessage(this.cwd, config.lint?.commitMsg);
  }

  /**
   * Install git hooks
   */
  async installHooks(): Promise<void> {
    const config = await this.getConfig();
    await installHooks(this.cwd, config.githooks);
  }

  /**
   * Uninstall git hooks
   */
  async uninstallHooks(): Promise<void> {
    const config = await this.getConfig();
    await uninstallHooks(this.cwd, config.githooks);
  }

  /**
   * List configured git hooks
   */
  async listHooks(): Promise<void> {
    const config = await this.getConfig();
    await listHooks(this.cwd, config.githooks);
  }
}

/**
 * Create a new Basis instance
 */
export function createBasis(cwd = process.cwd()): Basis {
  return new Basis(cwd);
}
