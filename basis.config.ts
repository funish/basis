import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  lint: {
    staged: {
      "*": "pnpm lint",
    },
    project: {
      check: "pnpm oxlint --fix --fix-suggestions",
      format:
        "pnpm prettier --write --list-different . --ignore-path .gitignore --plugin=@prettier/plugin-oxc",
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
