import { defineCommand } from "citty";
import { consola } from "consola";
import { readPackageJSON } from "pkg-types";
import { loadConfig } from "c12";
import { defu } from "defu";

import { build } from "./build";
import type { BuildConfig, BuildEntry } from "./types";

const packageJson = await readPackageJSON(import.meta.url);

export const buildCommand = defineCommand({
  meta: {
    name: "isbuild",
    description: packageJson.description || "Build your packages with tsdown",
    version: packageJson.version,
  },
  args: {
    _: {
      type: "string",
      description: "Entry files",
      rest: true,
    },
    cwd: {
      type: "string",
      description: "Project directory",
      default: ".",
    },
    stub: {
      type: "boolean",
      description: "Generate stub files",
    },
    format: {
      type: "string",
      description: "Output format: esm, cjs, iife, umd",
    },
    minify: {
      type: "boolean",
      description: "Minify output",
    },
    dts: {
      type: "boolean",
      description: "Generate type declarations",
    },
    "out-dir": {
      type: "string",
      description: "Output directory",
    },
    clean: {
      type: "boolean",
      description: "Clean output directory before build",
      default: true,
    },
    external: {
      type: "string",
      description: "External dependencies (comma-separated)",
    },
    watch: {
      type: "boolean",
      description: "Watch mode",
    },
    config: {
      type: "string",
      description: "Path to config file",
    },
    "no-config": {
      type: "boolean",
      description: "Disable config file",
    },
  },
  async run({ args }) {
    let entries: (string | BuildEntry)[] = [];

    if (!args["no-config"]) {
      const { config } = await loadConfig<BuildConfig>({
        name: "isbuild",
        configFile: args.config || "build.config",
        cwd: args.cwd,
      });

      if (config?.entries) {
        entries = config.entries;
      }
    }

    if (args._.length > 0) {
      entries = args._.map((entry) => {
        if (typeof entry === "string") {
          return { entry };
        }
        return entry;
      });
    }

    const cliOptions: Partial<BuildEntry> = {};
    if (args.format) cliOptions.format = args.format.split(",") as BuildEntry["format"];
    if (args.minify !== undefined) cliOptions.minify = args.minify;
    if (args.dts !== undefined) cliOptions.dts = args.dts;
    if (args["out-dir"]) cliOptions.outDir = args["out-dir"];
    if (args.external) cliOptions.external = args.external.split(",");

    const finalEntries = entries.map((entry) => {
      if (typeof entry === "string") {
        return defu({ entry, stub: args.stub }, cliOptions) as BuildEntry;
      }
      return defu(entry, { stub: args.stub }, cliOptions) as BuildEntry;
    });

    if (finalEntries.length === 0) {
      consola.error("No entry files specified. Provide entries via args or config file.");
      process.exit(1);
    }

    await build({
      cwd: args.cwd,
      entries: finalEntries,
    });
  },
});
