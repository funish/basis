import type { BuildContext, BuildConfig } from "./types";

import { rm } from "node:fs/promises";
import { consola } from "consola";
import { build as tsdownBuild } from "tsdown";
import { createJitiStub } from "./stub";
import {
  fmtPath,
  analyzeDir,
  normalizePath,
  normalizeEntries,
  collectOutDirs,
  expandGlobs,
} from "./utils";
import { readPackageJSON } from "pkg-types";
import prettyBytes from "pretty-bytes";
import { defu } from "defu";

export const DEFAULT_BUILD_OPTIONS = {
  outputOptions: {
    chunkFileNames: "_chunks/[name]-[hash].mjs",
  },
};

/**
 * Build dist/ from src/
 */
export async function build(config: BuildConfig): Promise<void> {
  const start = Date.now();

  const pkgDir = normalizePath(config.cwd);
  const pkg = await readPackageJSON(pkgDir);
  const ctx: BuildContext = { pkg, pkgDir };

  consola.start(`Building \`${ctx.pkg.name || "<no name>"}\` (\`${ctx.pkgDir}\`)`);

  const hooks = config.hooks || {};
  await hooks.start?.(ctx);

  const entries = await normalizeEntries(config.entries || [], pkgDir);

  const outDirs = await collectOutDirs(entries);
  for (const outDir of outDirs) {
    consola.info(`Cleaning up \`${fmtPath(outDir)}\``);
    await rm(outDir, { recursive: true, force: true });
  }

  for (const entry of entries) {
    if (entry.stub) {
      const expandedPaths = await expandGlobs(entry, ctx.pkgDir);
      for (const filePath of expandedPaths) {
        await createJitiStub(ctx, { entry: filePath, stub: true, outDir: entry.outDir });
      }
    } else {
      // Expand globs for all entries to ensure simple paths are resolved
      const expandedPaths = await expandGlobs(entry, ctx.pkgDir);
      // Create a clean entry object with expanded paths, avoiding array merging issues
      const finalEntry = {
        ...entry,
        entry: expandedPaths.length > 0 ? expandedPaths : entry.entry,
      };
      await tsdownBuild(defu(finalEntry, DEFAULT_BUILD_OPTIONS));
    }
  }

  await hooks.end?.(ctx);

  if (!entries.every((e) => e.stub)) {
    const dirSize = analyzeDir(outDirs);
    consola.info(`Total dist byte size: ${prettyBytes(dirSize.size)} (${dirSize.files} files)`);
  }

  consola.success(`isbuild finished in ${Date.now() - start}ms`);
}
