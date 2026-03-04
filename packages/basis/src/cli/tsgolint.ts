#!/usr/bin/env node

import { defineCommand, runCommand } from "citty";
import { runTool } from "../modules/run";

const tsgolintCommand = defineCommand({
  meta: {
    name: "tsgolint",
    description: "Lint TypeScript with tsgolint rules",
  },
  async run({ rawArgs }) {
    const result = runTool({
      pkg: "oxlint-tsgolint/bin/tsgolint.js",
      bin: "tsgolint.js",
      args: rawArgs,
    });

    if (result.status !== 0) {
      process.exit(result.status);
    }
  },
});

void runCommand(tsgolintCommand, {
  rawArgs: process.argv.slice(2),
  showUsage: false,
});
