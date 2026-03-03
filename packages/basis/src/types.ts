// ===============================================
// Type Imports
// ===============================================

import type { GitConfig as PKGitConfig } from "pkg-types";
import type { JitiOptions } from "jiti";

// ===============================================
// Main Configuration Types
// ===============================================

export interface BasisConfig {
  /** Extend from another config file or package */
  extends?: string | string[];

  // Command configurations (aligned with CLI commands)
  lint?: LintConfig;
  fmt?: FmtConfig;
  git?: GitConfig;
  run?: RunConfig;
  audit?: AuditConfig;
  version?: VersionConfig;
  publish?: PublishConfig;
}

// ===============================================
// Command Configuration Types
// ===============================================

/**
 * Lint command configuration
 */
export interface LintConfig {
  /** Linter configuration options (passed as command line args) */
  config?: string[];
}

/**
 * Format command configuration
 */
export interface FmtConfig {
  /** Formatter configuration options (passed as command line args) */
  config?: string[];
}

/**
 * Staged files configuration (lint-staged style)
 */
export interface StagedConfig {
  /** Commands to run on staged files */
  rules?: Record<string, string>;
}

/**
 * Git command configuration
 */
export interface GitConfig {
  /** Git hooks */
  hooks?: Partial<Record<ValidGitHook, string>>;

  /** Git configuration */
  config?: PKGitConfig;

  /** Commit message validation */
  commitMsg?: CommitMsgConfig;

  /** Staged files check */
  staged?: StagedConfig;
}

/**
 * Run command configuration
 */
export interface RunConfig {
  /** Runtime configuration options */
  config?: JitiOptions;
}

/**
 * Audit command configuration
 */
export interface AuditConfig {
  /** Dependencies audit */
  dependencies?: {
    /** Check for outdated dependencies */
    outdated?: boolean;

    /** Check for security vulnerabilities */
    security?: boolean;

    /** License compliance check */
    licenses?: {
      /** Allowed licenses */
      allowed?: string[];

      /** Blocked licenses */
      blocked?: string[];
    };

    /** Blocked packages */
    blocked?: string[];
  };

  /** Structure audit */
  structure?: {
    /** Required files/directories */
    required?: string[];

    /** File naming conventions */
    files?: Array<{
      pattern: string;
      rule: string;
      message: string;
    }>;

    /** Directory naming conventions */
    dirs?: Array<{
      pattern: string;
      rule: string;
      message: string;
    }>;
  };
}

/**
 * Version command configuration
 */
export interface VersionConfig {
  /** Prerelease identifier (default: "edge") */
  preid?: string;
}

/**
 * Publish command configuration
 */
export interface PublishConfig {
  /** NPM publish configuration */
  npm?: {
    /** Default publish tag (default: "latest") */
    tag?: string;

    /** Additional tag to also publish to (e.g., "edge") */
    additionalTag?: string;

    /** Package access level (default: "public") */
    access?: "public" | "restricted";
  };

  /** Git operations configuration */
  git?: {
    /** Git tag prefix (default: "v") */
    tagPrefix?: string;

    /** Commit message generator */
    message?: (version: string) => string;

    /** Auto push to remote */
    push?: boolean;

    /** Sign git tag */
    signTag?: boolean;
  };
}

// ===============================================
// Supporting Types
// ===============================================

/**
 * Commit message validation configuration
 */
export interface CommitMsgConfig {
  types?: string[];
  maxLength?: number;
  minLength?: number;
  scopeRequired?: boolean;
  allowedScopes?: string[];
}

/**
 * Parsed commit message
 */
export interface CommitMessage {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  footer?: string;
  isBreaking: boolean;
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

// ===============================================
// Command Options Types
// ===============================================

/**
 * Init command options
 */
export interface InitOptions {
  force?: boolean;
  skipGitCheck?: boolean;
  skipInstall?: boolean;
}

/**
 * Version command options
 */
export interface VersionOptions {
  /** Version number or increment type */
  version?: string;

  /** Prerelease identifier */
  preid?: string;

  /** Bump type */
  major?: boolean;
  minor?: boolean;
  patch?: boolean;
  premajor?: boolean;
  preminor?: boolean;
  prepatch?: boolean;
  prerelease?: boolean;
  fromGit?: boolean;

  /** Commit message */
  message?: string;

  /** Create git tag */
  tag?: boolean;

  /** Allow same version */
  allowSameVersion?: boolean;

  /** Skip commit hooks */
  noCommitHooks?: boolean;

  /** Sign git tag */
  signGitTag?: boolean;

  /** Workspace mode */
  workspace?: string[];
  workspaces?: boolean;
  noWorkspacesUpdate?: boolean;
  includeWorkspaceRoot?: boolean;
}

/**
 * Publish command options
 */
export interface PublishOptions {
  /** Tarball or directory to publish */
  tarball?: string;

  /**
   * Publish tag (overrides version-based tag detection)
   * Priority: options.tag > version prerelease > config.tag
   */
  tag?: string;

  /** Also create git tag and commit */
  git?: boolean;

  /** Package access level */
  access?: "public" | "restricted";

  /** Dry run mode */
  dryRun?: boolean;

  /** One-time password for 2FA */
  otp?: string;
}
