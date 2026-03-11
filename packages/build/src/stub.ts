import { writeFile, mkdir, chmod } from "node:fs/promises";
import { promises as fsp } from "node:fs";
import { resolve, dirname, extname, relative, join, basename } from "pathe";
import { resolveModuleExportNames, fileURLToPath } from "mlly";
import { createJiti } from "jiti";
import { consola } from "consola";
import { colors as c } from "consola/utils";
import { defu } from "defu";
import { genImport, genExport, genString } from "knitwork";
import type { BuildContext, BuildEntry } from "./types";

export const DEFAULT_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"];

export async function makeExecutable(filePath: string): Promise<void> {
  await chmod(filePath, 0o755);
}

export function getShebang(code: string): string {
  const match = code.match(/^#![^\n]*/);
  return match ? match[0] : "";
}

export function resolveAliases(ctx: BuildContext): Record<string, string> {
  const aliases: Record<string, string> = {};

  if (ctx.pkg.name) {
    aliases[ctx.pkg.name] = ctx.pkgDir;
  }

  const pkg = ctx.pkg;
  if (pkg.exports) {
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (
        key.startsWith("./") &&
        value &&
        typeof value === "object" &&
        "import" in value &&
        value.import
      ) {
        const exportPath = (value.import as string).replace(/^\.\//, "");
        const sourcePath = exportPath.replace(/^dist\//, "src/").replace(/\.m?js$/, "");
        aliases[key] = resolve(ctx.pkgDir, sourcePath);
      }
    }
  }

  return aliases;
}

export interface StubOptions {
  jiti: {
    transformOptions?: {
      babel?: {
        plugins?: Array<string | [string, unknown]>;
      };
    };
    alias?: Record<string, string>;
  };
}

export async function buildStub(
  ctx: BuildContext,
  entry: BuildEntry & { stub: true },
  stubOptions?: StubOptions,
): Promise<void> {
  const options = stubOptions || {
    jiti: {
      transformOptions: {
        babel: {
          plugins: [],
        },
      },
      alias: {},
    },
  };

  // Create jiti instance
  const jiti = createJiti(ctx.pkgDir, {
    ...options.jiti,
    alias: defu(resolveAliases(ctx), options.jiti.alias),
    transformOptions: {
      ...options.jiti.transformOptions,
    },
  });

  const babelPlugins = options.jiti.transformOptions?.babel?.plugins;
  const importedBabelPlugins: Array<string> = [];
  const serializedJitiOptions = JSON.stringify(
    defu(options.jiti, {
      alias: defu(resolveAliases(ctx), options.jiti.alias),
      transformOptions: defu(options.jiti.transformOptions || {}, {
        babel: {
          ...options.jiti.transformOptions?.babel,
          plugins: "__$BABEL_PLUGINS",
        },
      }),
    }),
    null,
    2,
  ).replace(
    '"__$BABEL_PLUGINS"',
    Array.isArray(babelPlugins)
      ? "[" +
          babelPlugins
            .map((plugin: string | Array<any>, i) => {
              if (Array.isArray(plugin)) {
                const [name, ...args] = plugin;
                importedBabelPlugins.push(name);
                return (
                  `[` + [`plugin${i}`, ...args.map((val) => JSON.stringify(val))].join(", ") + "]"
                );
              } else {
                importedBabelPlugins.push(plugin);
                return `plugin${i}`;
              }
            })
            .join(",") +
          "]"
      : "[]",
  );

  const inputs = await normalizeBundleInputs(
    (typeof entry.entry === "string"
      ? entry.entry
      : Array.isArray(entry.entry)
        ? entry.entry
        : Object.values(entry.entry || {})) as string | string[],
    ctx,
    entry.outDir,
  );

  for (const [distName, srcPath] of Object.entries(inputs)) {
    const output = resolve(ctx.pkgDir, entry.outDir || "dist", `${distName}.mjs`);

    const isESM = ctx.pkg.type === "module";
    const resolvedEntry = fileURLToPath(jiti.esmResolve(srcPath)!);
    const resolvedEntryWithoutExt = resolvedEntry.slice(
      0,
      Math.max(0, resolvedEntry.length - extname(resolvedEntry).length),
    );
    const resolvedEntryForTypeImport = isESM
      ? `${resolvedEntry.replace(/(\.m?)(ts)$/, "$1js")}`
      : resolvedEntryWithoutExt;
    const code = await fsp.readFile(resolvedEntry, "utf8");
    const shebang = getShebang(code);

    await mkdir(dirname(output), { recursive: true });

  consola.info(`${c.magenta("[stub]")} ${relative(ctx.pkgDir, output).replace(/\\/g, "/")}`);

  // MJS Stub
  // Try to analyze exports
  const namedExports: string[] = await resolveModuleExportNames(resolvedEntry, {
    extensions: DEFAULT_EXTENSIONS,
  }).catch((error) => {
    consola.warn(
      `${c.magenta("[stub]")} Cannot analyze exports for ${resolvedEntry}:`,
      error.message,
    );
    return [];
  });
  const hasDefaultExport = namedExports.includes("default") || namedExports.length === 0;

  const jitiESMPath = "jiti";

  // Generate stub content using knitwork
  const lines: string[] = [];

  // Imports
  lines.push(genImport(jitiESMPath, ["createJiti"]));
  importedBabelPlugins.forEach((plugin, i) => {
    lines.push(genImport(plugin, [{ name: "default", as: `plugin${i}` }]));
  });

  // Jiti initialization
  lines.push("", `const jiti = createJiti(import.meta.url, ${serializedJitiOptions})`, "");

  // Type annotation and module import
  lines.push(
    `/** @type {import(${genString(resolvedEntryForTypeImport)})} */`,
    `const _module = await jiti.import(${genString(resolvedEntry)});`,
  );

  // Default export
  if (hasDefaultExport) {
    lines.push("", "export default _module?.default ?? _module;");
  }

  // Named exports
  namedExports
    .filter((name) => name !== "default")
    .forEach((name) => {
      lines.push(`export const ${name} = _module.${name};`);
    });

  await writeFile(
    output,
    (shebang ? shebang + "\n" : "") + lines.join("\n"),
  );

  // DTS Stub
  const dtsLines: string[] = [];
  dtsLines.push(genExport(resolvedEntryForTypeImport, [{ name: "*", as: "" }]));
  if (hasDefaultExport) {
    dtsLines.push(genExport(resolvedEntryForTypeImport, [{ name: "default", as: "default" }]));
  }
  await writeFile(output.replace(/\.mjs$/, ".d.mts"), dtsLines.join("\n"));

    if (shebang) {
      await makeExecutable(output);
    }
  }
}

export async function normalizeBundleInputs(
  input: string | string[],
  ctx: BuildContext,
  outDir?: string,
): Promise<Record<string, string>> {
  const inputs: Record<string, string> = {};

  for (let src of Array.isArray(input) ? input : [input]) {
    // Resolve relative path to absolute path
    const resolved = resolve(ctx.pkgDir, src);

    // Calculate relative path for dist naming
    let relativeSrc: string;
    if (resolved.startsWith(ctx.pkgDir)) {
      // Input is absolute path from pkgDir
      relativeSrc = relative(ctx.pkgDir, resolved);
    } else {
      // Input is relative path, calculate relative to src/
      relativeSrc = relative(join(ctx.pkgDir, "src"), resolved);
      if (relativeSrc.startsWith("..")) {
        relativeSrc = relative(join(ctx.pkgDir), resolved);
      }
    }

    if (relativeSrc.startsWith("..")) {
      throw new Error(`Source should be within the package directory (${ctx.pkgDir}): ${src}`);
    }

    // Remove src/ prefix if present (for glob-expanded files)
    if (relativeSrc.startsWith("src/")) {
      relativeSrc = relativeSrc.slice(4);
    }

    // If outDir already contains the subdirectory (e.g., dist/commands/), keep only filename
    if (outDir && outDir !== "dist") {
      const outDirBasename = basename(outDir);
      if (relativeSrc.startsWith(`${outDirBasename}/`)) {
        relativeSrc = relativeSrc.slice(outDirBasename.length + 1);
      }
    }

    const distName = join(dirname(relativeSrc), basename(relativeSrc, extname(relativeSrc)));
    if (inputs[distName]) {
      throw new Error(
        `Rename one of the entries to avoid a conflict in the dist name "${distName}":\n - ${src}\n - ${inputs[distName]}`,
      );
    }
    inputs[distName] = resolved;
  }

  return inputs;
}
