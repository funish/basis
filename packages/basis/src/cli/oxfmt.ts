#!/usr/bin/env node

import { runCommand } from "citty";
import { fmtCommand } from "../commands/fmt";

void runCommand(fmtCommand, {
  rawArgs: process.argv.slice(2),
  showUsage: false,
});
