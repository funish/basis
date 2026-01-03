import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  lint: [
    {
      runner: "oxlint",
    },
    {
      runner: "tsc",
    },
  ],
  fmt: [
    {
      runner: "oxfmt",
    },
  ],
  check: {
    staged: {
      "*.{ts,tsx,js,jsx}": "basis lint",
      "*.{ts,tsx,js,jsx,json,md,yml,yaml}": "basis fmt",
    },
    project: {
      lint: "basis lint",
      format: "basis fmt",
    },
    dependencies: {
      allowedLicenses: ["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause"],
    },
  },
  git: {
    hooks: {
      "pre-commit": "pnpm basis check --staged",
      "commit-msg": "pnpm basis git --lint-commit",
    },
    commitMsg: {},
  },
});
