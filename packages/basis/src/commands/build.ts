import { build } from "@funish/build";
import type { BuildEntry } from "@funish/build";
import { loadConfig as loadConfigC12 } from "c12";
import { defineCommand } from "citty";
import { consola } from "consola";
import { readPackageJSON } from "pkg-types";

const packageJson = await readPackageJSON(import.meta.url);

interface PackConfig {
  entry?: BuildEntry["entry"];
  outDir?: string;
}

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build project (use --stub for development, vp pack for production)",
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
      description: "Generate stub files for development",
    },
    "no-config": {
      type: "boolean",
      description: "Disable config file",
    },
  },
  async run({ args }) {
    let entries: BuildEntry[] = [];

    if (!args["no-config"]) {
      // Read pack config from vite.config.ts
      const { config } = await loadConfigC12({
        name: "vite",
        cwd: args.cwd,
      });

      const pack = config?.pack as PackConfig | PackConfig[] | undefined;

      if (pack) {
        const packs = Array.isArray(pack) ? pack : [pack];
        entries = packs
          .filter((p) => p.entry)
          .map((p) => ({
            entry: p.entry!,
            outDir: p.outDir,
            stub: args.stub,
          }));
      }
    }

    // CLI arguments override config
    if (args._.length > 0) {
      entries = args._.map((entry) => ({
        entry,
        stub: args.stub,
      }));
    }

    if (entries.length === 0) {
      consola.error(
        "No entry files specified. Configure pack.entry in vite.config.ts or provide entries via args.",
      );
      process.exit(1);
    }

    await build({
      cwd: args.cwd,
      entries,
    });
  },
});
