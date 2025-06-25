import type { BasisConfig } from "./types";

/**
 * Define a Basis configuration
 */
export function defineBasisConfig(config: BasisConfig): BasisConfig {
  return config;
}

/**
 * Default configuration
 */
export const defaultConfig: BasisConfig = {
  lint: {
    staged: {},
    commitMsg: {
      types: [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
      maxLength: 72,
      minLength: 10,
    },
  },
  githooks: {
    autoInitGit: true,
    skipGitCheck: false,
    force: false,
  },
  packageManager: {
    autoDetect: true,
    registry: "https://registry.npmjs.org/",
  },
  version: {
    tagPrefix: "v",
    prereleaseId: "edge",
    commitMessage: "chore: release v{version}",
  },
  publish: {
    defaultTag: "edge",
    stableTag: "latest",
  },
};
