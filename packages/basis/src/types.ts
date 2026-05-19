// ===============================================
// Main Configuration Types
// ===============================================

export interface BasisConfig {
  /** Extend from another config file or package */
  extends?: string | string[];

  /** Release workflow configuration (version + publish) */
  release?: ReleaseConfig;

  /** Git configuration */
  git?: {
    /** Commit message validation rules */
    commitMsg?: CommitMsgConfig;
  };

  /** Audit configuration */
  audit?: AuditConfig;
}

// ===============================================
// Release Configuration
// ===============================================

export interface ReleaseConfig {
  /** Prerelease identifier (default: "edge") */
  preid?: string;

  /** NPM publish configuration */
  npm?: {
    /** Default publish tag (default: "latest") */
    tag?: string;

    /** Additional tag to also publish to (e.g., "edge") */
    additionalTag?: string;

    /** Package access level (default: "public") */
    access?: "public" | "restricted";
  };

  /** Git operations configuration during publish */
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
// Commit Message Configuration
// ===============================================

export interface CommitMsgConfig {
  /** Allowed commit types */
  types?: string[];

  /** Maximum header length (default: 72) */
  maxLength?: number;

  /** Minimum header length (default: 10) */
  minLength?: number;

  /** Whether scope is required */
  scopeRequired?: boolean;

  /** Allowed scopes */
  allowedScopes?: string[];
}

// ===============================================
// Command Options Types
// ===============================================

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
}

export interface PublishOptions {
  /** Tarball or directory to publish */
  tarball?: string;

  /** Publish tag */
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

// ===============================================
// Supporting Types
// ===============================================

/** Parsed commit message */
export interface CommitMessage {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  footer?: string;
  isBreaking: boolean;
}

// ===============================================
// Audit Configuration
// ===============================================

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
