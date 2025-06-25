// ===============================================
// Main Configuration Types
// ===============================================

export interface BasisConfig {
  lint?: LintConfig;
  githooks?: GitHooksConfig;
  packageManager?: PackageManagerConfig;
  version?: VersionConfig;
  publish?: PublishConfig;
}

// ===============================================
// Module Configuration Types
// ===============================================

export interface LintConfig {
  staged?: Record<string, string>;
  commitMsg?: {
    types?: string[];
    maxLength?: number;
    minLength?: number;
    scopeRequired?: boolean;
    allowedScopes?: string[];
  };
}

// Git official hooks from https://git-scm.com/docs/githooks
export const VALID_GIT_HOOKS = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "pre-receive",
  "update",
  "proc-receive",
  "post-receive",
  "post-update",
  "reference-transaction",
  "push-to-checkout",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "fsmonitor-watchman",
  "p4-changelist",
  "p4-prepare-changelist",
  "p4-post-changelist",
  "p4-pre-submit",
  "post-index-change",
] as const;

export type ValidGitHook = (typeof VALID_GIT_HOOKS)[number];

export interface GitHooksConfig extends Partial<Record<ValidGitHook, string>> {
  /** Whether to automatically initialize git repository if not found */
  autoInitGit?: boolean;
  /** Whether to skip git command availability check */
  skipGitCheck?: boolean;
  /** Force operation even if git is not available */
  force?: boolean;
}

export interface PackageManagerConfig {
  /** Preferred package manager (aligned with nypm support) */
  preferred?: "npm" | "yarn" | "pnpm" | "bun" | "deno";
  /** Auto-detect package manager from project */
  autoDetect?: boolean;
  /** NPM registry URL */
  registry?: string;
}

export interface VersionConfig {
  /** Git tag prefix */
  tagPrefix?: string;
  /** Auto commit version changes */
  autoCommit?: boolean;
  /** Auto create git tag */
  autoTag?: boolean;
  /** Auto push changes to remote */
  autoPush?: boolean;
  /** Prerelease identifier (alpha, beta, rc) */
  prereleaseId?: string;
  /** Commit message template */
  commitMessage?: string;
}

export interface PublishConfig {
  /** NPM registry URL */
  registry?: string;
  /** Package access level */
  access?: "public" | "private";
  /** Default publish tag (for non-stable releases) */
  defaultTag?: string;
  /** Stable release tag */
  stableTag?: string;
  /** Build command before publish */
  buildCommand?: string;
  /** Test command before publish */
  testCommand?: string;
  /** Check git working directory is clean */
  checkGitClean?: boolean;
  /** Run tests before publish */
  checkTests?: boolean;
  /** Auto push git changes after publish */
  autoGitPush?: boolean;
  /** Create git tag after publish */
  createGitTag?: boolean;
}

// ===============================================
// Lint Related Types
// ===============================================

export interface CommitMessage {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  footer?: string;
  isBreaking: boolean;
}

// ===============================================
// Command Options Types
// ===============================================

export interface InitOptions {
  force?: boolean;
  skipGitCheck?: boolean;
  skipInstall?: boolean;
}

export interface VersionOptions {
  version?: string;
  preid?: string;
  prerelease?: boolean;
  major?: boolean;
  minor?: boolean;
  patch?: boolean;
  tag?: string;
  message?: string;
}

export interface PublishOptions {
  tag?: string;
  stable?: boolean;
  latest?: boolean;
  dryRun?: boolean;
  access?: "public" | "private";
  registry?: string;
  skipBuild?: boolean;
  skipTests?: boolean;
}

export interface VersionUpdateResult {
  oldVersion: string;
  newVersion: string;
  tagName?: string;
}

export interface PublishResult {
  packageName: string;
  version: string;
  publishTag: string;
  dryRun: boolean;
}
