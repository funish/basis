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
  },
  git: {
    hooks: {
      "pre-commit": "pnpm basis lint --staged",
      "commit-msg": "pnpm basis git --lint-commit",
    },
    commitMsg: {},
  },
});
