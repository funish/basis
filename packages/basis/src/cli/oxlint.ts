#!/usr/bin/env node

import { runCommand } from "citty";
import { lintCommand } from "../commands/lint";

void runCommand(lintCommand, {
  rawArgs: process.argv.slice(2),
  showUsage: false,
});
