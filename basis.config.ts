import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  lint: {
    staged: {
      "*": "pnpm check && pnpm format",
    },
    commitMsg: {},
  },
  githooks: {
    "pre-commit": "pnpm basis lint --staged",
    "commit-msg": "pnpm basis lint --commit-msg",
  },
});
