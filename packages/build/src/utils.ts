import { readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "pathe";
import { glob } from "tinyglobby";
import { fileURLToPath } from "mlly";
import type { BuildEntry } from "./types";

export function fmtPath(path: string): string {
  return resolve(path).replace(process.cwd(), ".");
}

export function analyzeDir(dir: string | string[]): { size: number; files: number } {
  if (Array.isArray(dir)) {
    let totalSize = 0;
    let totalFiles = 0;
    for (const d of dir) {
      const { size, files } = analyzeDir(d);
      totalSize += size;
      totalFiles += files;
    }
    return { size: totalSize, files: totalFiles };
  }

  let totalSize = 0;
  let totalFiles = 0;

  try {
    const files = readdirSync(dir, { withFileTypes: true, recursive: true });

    for (const file of files) {
      const fullPath = join(file.parentPath, file.name);
      if (file.isFile()) {
        const { size } = statSync(fullPath);
        totalSize += size;
      }
    }
    totalFiles = files.length;
  } catch {
    // Directory doesn't exist or can't be read
  }

  return { size: totalSize, files: totalFiles };
}

export function normalizePath(path: string | URL | undefined, resolveFrom?: string) {
  return typeof path === "string" && isAbsolute(path)
    ? path
    : path instanceof URL
      ? fileURLToPath(path)
      : resolve(resolveFrom || ".", path || ".");
}

export async function normalizeEntries(
  entries: (BuildEntry | string)[],
  pkgDir: string,
): Promise<BuildEntry[]> {
  const normalized: BuildEntry[] = [];

  for (const rawEntry of entries) {
    if (typeof rawEntry === "string") {
      normalized.push({ entry: rawEntry });
    } else {
      const entry = { ...rawEntry };
      entry.outDir = entry.outDir
        ? normalizePath(entry.outDir, pkgDir)
        : normalizePath("dist", pkgDir);
      normalized.push(entry);
    }
  }

  return normalized;
}

export async function collectOutDirs(entries: BuildEntry[]): Promise<string[]> {
  const outDirs = new Set<string>();
  for (const entry of entries) {
    outDirs.add(entry.outDir || "dist");
  }
  return Array.from(outDirs).sort();
}

export function getEntryPaths(entry: BuildEntry): Array<string | Record<string, unknown>> {
  if (Array.isArray(entry.entry)) {
    return entry.entry;
  } else if (typeof entry.entry === "string") {
    return [entry.entry];
  } else {
    return Object.values(entry.entry || {}) as Array<string | Record<string, unknown>>;
  }
}

export async function expandGlobs(entry: BuildEntry, pkgDir: string): Promise<string[]> {
  const paths = getEntryPaths(entry);

  // Filter to only string paths
  const stringPaths = paths.filter((p): p is string => typeof p === "string");

  if (stringPaths.length === 0) {
    return [];
  }

  // Check if any path contains glob patterns
  const hasGlob = stringPaths.some((path) => path.includes("*"));

  if (hasGlob) {
    // If any glob pattern exists, expand all paths using glob()
    const expanded = await glob(stringPaths, {
      cwd: pkgDir,
      expandDirectories: false,
      absolute: true,
    });
    return expanded.map((file) => resolve(file));
  } else {
    // No glob patterns, use paths directly
    // tsdown/rolldown will auto-resolve extensions
    return stringPaths.map((path) => normalizePath(path, pkgDir));
  }
}
