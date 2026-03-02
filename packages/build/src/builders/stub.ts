import { writeFile, mkdir } from "node:fs/promises";
import { promises as fsp } from "node:fs";
import { resolve, dirname, extname, relative, join, basename } from "pathe";
import {
  resolveModuleExportNames,
  fileURLToPath,
} from "mlly";
import { createJiti } from "jiti";
import { consola } from "consola";
import { colors as c } from "consola/utils";
import { makeExecutable } from "./plugins/shebang";
import type { BuildContext, BundleEntry } from "../types";

const DEFAULT_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"];

function resolveAliases(ctx: BuildContext): Record<string, string> {
  const aliases: Record<string, string> = {};

  // Map package name to root directory (absolute path)
  if (ctx.pkg.name) {
    aliases[ctx.pkg.name] = ctx.pkgDir;
  }

  // Add common aliases based on package exports
  // Convert relative paths to absolute paths pointing to source directory
  const pkg = ctx.pkg;
  if (pkg.exports) {
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (key.startsWith("./") && value && typeof value === "object" && "import" in value && value.import) {
        // Get the export path (e.g., "./dist/config.mjs" or "dist/config.mjs")
        const exportPath = (value.import as string).replace(/^\.\//, "");

        // Convert dist path to source path
        // e.g., "dist/config.mjs" → "src/config"
        // e.g., "dist/commands/*.mjs" → "src/commands/*"
        const sourcePath = exportPath
          .replace(/^dist\//, "src/")
          .replace(/\.m?js$/, "");

        // Create absolute path to source directory
        aliases[key] = resolve(ctx.pkgDir, sourcePath);
      }
    }
  }

  return aliases;
}

function getShebang(code: string): string {
  const match = code.match(/^#![^\n]*/);
  return match ? match[0] : "";
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
  absoluteJitiPath?: boolean;
}

export async function createJitiStub(
  ctx: BuildContext,
  entry: BundleEntry,
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
    alias: {
      ...resolveAliases(ctx),
      ...options.jiti.alias,
    },
    transformOptions: {
      ...options.jiti.transformOptions,
    },
  });

  const babelPlugins = options.jiti.transformOptions?.babel
    ?.plugins;
  const importedBabelPlugins: Array<string> = [];
  const serializedJitiOptions = JSON.stringify(
    {
      ...options.jiti,
      alias: {
        ...resolveAliases(ctx),
        ...options.jiti.alias,
      },
      transformOptions: {
        ...options.jiti.transformOptions,
        babel: {
          ...options.jiti.transformOptions?.babel,
          plugins: "__$BABEL_PLUGINS",
        },
      },
    },
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
                  `[` +
                  [
                    `plugin${i}`,
                    ...args.map((val) => JSON.stringify(val)),
                  ].join(", ") +
                  "]"
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

  const inputs = await normalizeBundleInputs(entry.input, ctx);

  for (const [distName, srcPath] of Object.entries(inputs)) {
    const output = resolve(
      ctx.pkgDir,
      entry.outDir || "dist",
      `${distName}.mjs`,
    );

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

    consola.log(`${c.magenta("[stub] ")} ${c.underline(output)} ${c.dim("(jiti)")}`);

    // MJS Stub
    // Try to analyze exports
    const namedExports: string[] = await resolveModuleExportNames(
      resolvedEntry,
      {
        extensions: DEFAULT_EXTENSIONS,
      },
    ).catch((error) => {
      consola.warn(`Cannot analyze ${resolvedEntry} for exports:`, error.message);
      return [];
    });
    const hasDefaultExport =
      namedExports.includes("default") || namedExports.length === 0;

    const jitiESMPath = "jiti";

    await writeFile(
      output,
      (shebang ? shebang + "\n" : "") +
        [
          `import { createJiti } from ${JSON.stringify(jitiESMPath)};`,
          ...importedBabelPlugins.map(
            (plugin, i) => `import plugin${i} from ${JSON.stringify(plugin)}`,
          ),
          "",
          `const jiti = createJiti(import.meta.url, ${serializedJitiOptions})`,
          "",
          `/** @type {import(${JSON.stringify(
            resolvedEntryForTypeImport,
          )})} */`,
          `const _module = await jiti.import(${JSON.stringify(
            resolvedEntry,
          )});`,
          hasDefaultExport
            ? "\nexport default _module?.default ?? _module;"
            : "",
          ...namedExports
            .filter((name) => name !== "default")
            .map((name) => `export const ${name} = _module.${name};`),
        ].join("\n"),
    );

    // DTS Stub
    const dtsContent = [
      `export * from ${JSON.stringify(resolvedEntryForTypeImport)};`,
      hasDefaultExport
        ? `export { default } from ${JSON.stringify(resolvedEntryForTypeImport)};`
        : "",
    ].join("\n");
    await writeFile(output.replace(/\.mjs$/, ".d.mts"), dtsContent);
    await writeFile(output.replace(/\.mjs$/, ".d.ts"), dtsContent);

    if (shebang) {
      await makeExecutable(output);
    }
  }
}

async function normalizeBundleInputs(
  input: string | string[],
  ctx: BuildContext,
): Promise<Record<string, string>> {
  const inputs: Record<string, string> = {};

  for (let src of Array.isArray(input) ? input : [input]) {
    // Input is already an absolute path, just use it directly
    const resolved = src;

    let relativeSrc = relative(join(ctx.pkgDir, "src"), resolved);
    if (relativeSrc.startsWith("..")) {
      relativeSrc = relative(join(ctx.pkgDir), resolved);
    }
    if (relativeSrc.startsWith("..")) {
      throw new Error(`Source should be within the package directory (${ctx.pkgDir}): ${src}`);
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
