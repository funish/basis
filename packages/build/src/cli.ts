#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { readPackageJSON } from "pkg-types";
import { loadConfig } from "c12";

import { build } from "./build";
import type { BuildConfig, BuildEntry } from "./types";

const packageJson = await readPackageJSON(import.meta.url);

const buildCommand = defineCommand({
  meta: {
    name: "isbuild",
    description: packageJson.description || "Build your packages with rolldown",
    version: packageJson.version,
  },
  args: {
    dir: {
      type: "string",
      description: "Project directory",
      default: ".",
    },
    stub: {
      type: "boolean",
      description: "Generate stub files",
      default: false,
    },
  },
  async run({ args }) {
    const { config = {} } = await loadConfig<BuildConfig>({
      name: "isbuild",
      configFile: "build.config",
      cwd: args.dir,
    });

    // Apply stub option to all entries
    const entries: (string | BuildEntry)[] = (config.entries || []).map((entry) => {
      if (typeof entry === "string") {
        const [input, outDir] = entry.split(":") as [string, string | undefined];
        if (input.endsWith("/")) {
          return {
            type: "transform",
            input,
            outDir,
            stub: args.stub,
          } as BuildEntry;
        } else {
          return {
            type: "bundle",
            input: input.split(","),
            outDir,
            stub: args.stub,
          } as BuildEntry;
        }
      }
      return {
        ...entry,
        stub: args.stub,
      } as BuildEntry;
    });

    if (!entries || entries.length === 0) {
      consola.error("No build entries specified in build.config.");
      process.exit(1);
    }

    await build({
      cwd: args.dir,
      ...config,
      entries: entries as BuildEntry[],
    });
  },
});

runMain(buildCommand).catch((error) => {
  consola.error(error);
  process.exit(1);
});
