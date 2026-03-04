#!/usr/bin/env node

import { runMain } from "citty";
import { consola } from "consola";
import { buildCommand } from "./command";

runMain(buildCommand).catch((error) => {
  consola.error(error);
  process.exit(1);
});
