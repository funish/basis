#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { readPackageJSON } from "pkg-types";

import { initCommand } from "./commands/init";
import { lintCommand } from "./commands/lint";
import { fmtCommand } from "./commands/fmt";
import { checkCommand } from "./commands/check";
import { buildCommand } from "./commands/build";
import { gitCommand } from "./commands/git";
import { runCommand } from "./commands/run";
import { versionCommand } from "./commands/version";
import { publishCommand } from "./commands/publish";
import { auditCommand } from "./commands/audit";
import { addCommand } from "./commands/add";
import { removeCommand } from "./commands/remove";
import { dlxCommand } from "./commands/dlx";

const packageJson = await readPackageJSON(import.meta.url);

const main = defineCommand({
  meta: {
    name: "basis",
    description: packageJson.description,
    version: packageJson.version,
  },
  subCommands: {
    init: initCommand,
    lint: lintCommand,
    fmt: fmtCommand,
    check: checkCommand,
    build: buildCommand,
    git: gitCommand,
    run: runCommand,
    version: versionCommand,
    publish: publishCommand,
    audit: auditCommand,
    add: addCommand,
    remove: removeCommand,
    dlx: dlxCommand,
  },
});

void runMain(main);
