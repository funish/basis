// ===============================================
// Main Configuration Types
// ===============================================

export interface BasisConfig {
  lint?: LintConfig;
  git?: GitConfig;
  version?: VersionConfig;
  publish?: PublishConfig;
}

// ===============================================
// Module Configuration Types
// ===============================================

export interface LintConfig {
  // Code quality checks for staged files
  staged?: Record<string, string>;

  // Project-wide commands (similar to staged but for entire project)
  project?: Record<string, string>;

  // Dependencies checks
  dependencies?: {
    checkOutdated?: boolean;
    checkSecurity?: boolean;
    allowedLicenses?: string[];
    blockedPackages?: string[];
  };

  // Project structure checks
  structure?: {
    requiredFiles?: string[];
    requiredDirs?: string[];
    naming?: Array<{
      path: string; // Directory path pattern (glob)
      files?: string; // File naming pattern (regex)
      directories?: string; // Directory naming pattern (regex)
      description?: string; // Rule description
    }>;
  };

  // Documentation checks
  docs?: {
    checkReadme?: boolean;
    checkChangelog?: boolean;
  };

  // Auto-fix configuration
  fix?: {
    /** Enable automatic fixing for all supported issues */
    autoFix?: boolean;

    /** Dependency fix options */
    dependencies?: {
      /** Automatically remove blocked packages */
      removeBlocked?: boolean;
      /** Automatically update outdated dependencies */
      updateOutdated?: boolean;
      /** Attempt to fix security vulnerabilities */
      fixSecurity?: boolean;
      /** Ask for confirmation before making changes */
      interactive?: boolean;
    };

    /** Structure fix options */
    structure?: {
      /** Automatically create missing required files */
      createMissingFiles?: boolean;
      /** Automatically create missing required directories */
      createMissingDirs?: boolean;
      /** Generate file templates for missing files */
      generateTemplates?: boolean;
    };

    /** Documentation fix options */
    docs?: {
      /** Generate README.md template if missing */
      generateReadme?: boolean;
      /** Generate CHANGELOG.md template if missing */
      generateChangelog?: boolean;
    };
  };
}

export interface GitConfig {
  hooks?: Partial<Record<ValidGitHook, string>>;

  // Git configuration with nested structure for better organization
  config?: {
    // Core settings
    core?: {
      editor?: string;
      autocrlf?: boolean | "input";
      eol?: "lf" | "crlf" | "native";
      ignorecase?: boolean;
      filemode?: boolean;
      bare?: boolean;
      logallrefupdates?: boolean;
      repositoryformatversion?: number;
      sharedrepository?: boolean | "group" | "all" | "world" | "everybody";
      worktree?: string;
      precomposeunicode?: boolean;
      protecthfs?: boolean;
      protectntfs?: boolean;
    };

    // User identity
    user?: {
      name?: string;
      email?: string;
      signingkey?: string;
    };

    // Branch settings
    init?: {
      defaultBranch?: string;
    };
    branch?: {
      autosetupmerge?: boolean | "always";
      autosetuprebase?: "never" | "local" | "remote" | "always";
    };

    // Push settings
    push?: {
      default?: "nothing" | "current" | "upstream" | "simple" | "matching";
      followTags?: boolean;
      autoSetupRemote?: boolean;
    };

    // Pull settings
    pull?: {
      rebase?: boolean | "preserve" | "merges" | "interactive";
      ff?: boolean | "only";
    };

    // Merge settings
    merge?: {
      tool?: string;
      conflictstyle?: "merge" | "diff3";
      ff?: boolean | "only";
      log?: boolean | number;
    };

    // Rebase settings
    rebase?: {
      autoSquash?: boolean;
      autoStash?: boolean;
      updateRefs?: boolean;
    };

    // Fetch settings
    fetch?: {
      prune?: boolean;
      pruneTags?: boolean;
      fsckobjects?: boolean;
    };

    // Remote settings
    remote?: {
      [remoteName: string]: {
        url?: string;
        fetch?: string;
      };
    };

    // Diff settings
    diff?: {
      tool?: string;
      algorithm?: "myers" | "minimal" | "patience" | "histogram";
      renames?: boolean | "copy" | "copies";
      mnemonicprefix?: boolean;
    };

    // Status settings
    status?: {
      showUntrackedFiles?: "no" | "normal" | "all";
      branch?: boolean;
      short?: boolean;
    };

    // Commit settings
    commit?: {
      cleanup?: "strip" | "whitespace" | "verbatim" | "scissors" | "default";
      gpgsign?: boolean;
      template?: string;
      verbose?: boolean;
    };

    // Log settings
    log?: {
      abbrevCommit?: boolean;
      decorate?: boolean | "short" | "full" | "auto" | "no";
      showSignature?: boolean;
    };

    // Security settings
    transfer?: {
      fsckobjects?: boolean;
    };
    receive?: {
      fsckObjects?: boolean;
    };

    // Performance settings
    gc?: {
      auto?: number;
      autopacklimit?: number;
      autodetach?: boolean;
    };

    // Aliases
    alias?: {
      [aliasName: string]: string;
    };

    // URL rewriting
    url?: {
      [pattern: string]: {
        insteadOf?: string;
        pushInsteadOf?: string;
      };
    };
  };

  commitMsg?: CommitMsgConfig;
  autoSetup?: boolean;
  autoInitGit?: boolean;
  skipGitCheck?: boolean;
  force?: boolean;
}

export interface CommitMsgConfig {
  types?: string[];
  maxLength?: number;
  minLength?: number;
  scopeRequired?: boolean;
  allowedScopes?: string[];
}

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

// Git configuration data types for ini format
export type GitConfigValue = string | number | boolean;
export type GitConfigSection = Record<string, GitConfigValue>;
export type GitConfigData = Record<string, GitConfigSection>;

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
