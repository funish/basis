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
  lint: [
    {
      runner: "oxlint",
      // runnerOptions: {
      //   paths: undefined,  // Let tools use default behavior
      // },
    },
  ],

  check: {
    dependencies: {
      checkSecurity: true,
    },
    structure: {
      requiredFiles: ["package.json"],
    },
  },

  fmt: [
    {
      runner: "oxfmt",
      // runnerOptions: {
      //   paths: undefined,  // Let tools use default behavior
      // },
    },
  ],
  git: {
    hooks: {},
    config: {
      core: {
        autocrlf: "input",
      },
    },
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
    },
    autoSetup: true,
    autoInitGit: true,
    skipGitCheck: false,
    force: false,
  },
  version: {
    tagPrefix: "v",
    prereleaseId: "edge",
  },
  publish: {
    defaultTag: "edge",
    stableTag: "latest",
  },
};
