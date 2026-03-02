import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { resolve } from "pathe";
import { build } from "@funish/build";
import { loadConfig } from "c12";
import type { BuildConfig, BuildEntry } from "@funish/build";

export const buildCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "build",
    description: "Build project",
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
    const cwd = resolve(args.dir || ".");

    try {
      // Load config
      const { config = {} } = await loadConfig<BuildConfig>({
        name: "isbuild",
        configFile: "build.config",
        cwd,
      });

      // Apply stub option to all entries
      const entries = (config.entries || []).map((entry) => {
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

      // Execute build
      await build({
        cwd,
        ...config,
        entries,
      });

      consola.success("Build completed");
    } catch (error) {
      consola.error("Build failed:", error);
      process.exit(1);
    }
  },
});
