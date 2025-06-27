import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  lint: {
    staged: {
      "*": "pnpm lint",
    },
    project: {
      check: "pnpm biome check . --write --unsafe",
      format:
        "pnpm prettier --write --list-different . --ignore-path .gitignore",
    },
    dependencies: {
      allowedLicenses: ["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause"],
    },
  },
  git: {
    hooks: {
      "pre-commit": "pnpm basis lint --staged",
      "commit-msg": "pnpm basis git --lint-commit",
    },
    commitMsg: {},
  },
});
