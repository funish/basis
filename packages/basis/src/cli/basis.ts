#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { readPackageJSON } from "pkg-types";

import { auditCommand } from "../commands/audit";
import { buildCommand } from "../commands/build";
import { gitCommand } from "../commands/git";
import { publishCommand } from "../commands/publish";
import { versionCommand } from "../commands/version";

const packageJson = await readPackageJSON(import.meta.url);

const main = defineCommand({
  meta: {
    name: "basis",
    description: packageJson.description,
    version: packageJson.version,
  },
  subCommands: {
    version: versionCommand,
    publish: publishCommand,
    build: buildCommand,
    git: gitCommand,
    audit: auditCommand,
  },
});

void runMain(main);
