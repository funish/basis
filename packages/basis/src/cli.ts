#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { readPackageJSON } from "pkg-types";

async function main() {
  const packageJson = await readPackageJSON();

  const cli = defineCommand({
    meta: {
      name: "basis",
      version: packageJson.version || "",
      description: packageJson.description || "",
    },
    subCommands: {
      init: () => import("./commands/init").then((m) => m.default),
      config: () => import("./commands/config").then((m) => m.default),
      lint: () => import("./commands/lint").then((m) => m.default),
      githooks: () => import("./commands/githooks").then((m) => m.default),
      // Package management commands (using nypm)
      install: () => import("./commands/install").then((m) => m.default),
      i: () => import("./commands/install").then((m) => m.default),
      add: () => import("./commands/add").then((m) => m.default),
      remove: () => import("./commands/remove").then((m) => m.default),
      rm: () => import("./commands/remove").then((m) => m.default),
      uninstall: () => import("./commands/remove").then((m) => m.default),
      run: () => import("./commands/run").then((m) => m.default),
      // Version and publish commands
      version: () => import("./commands/version").then((m) => m.default),
      publish: () => import("./commands/publish").then((m) => m.default),
    },
  });

  await runMain(cli);
}

main().catch(consola.error);
