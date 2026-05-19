# @funish/build

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/build.svg)](https://www.npmjs.org/package/@funish/build)

> Modern build system powered by tsdown with Jiti stub support.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is @funish/build?

@funish/build is a **build system** designed for modern TypeScript/JavaScript projects. It leverages [tsdown](https://tsdown.dev) for ultra-fast bundling and [Jiti](https://github.com/unjs/jiti) for development stub generation.

**Inspired by**: [unbuild](https://github.com/unjs/unbuild), with modern tooling (Rolldown + Oxc).

## Features

- ⚡ **tsdown-powered**: Blazing fast builds powered by Rolldown and Oxc
- 🔧 **Zero Configuration**: Sensible defaults with optional customization
- 📦 **Flexible Build Modes**:
  - **Bundle**: Production bundling with code splitting
  - **Unbundle**: Keep module structure for plugins/tools
  - **Stub**: Development stubs with Jiti for instant iteration
- 🎯 **TypeScript First**: Full TypeScript support with automatic type declarations
- 📝 **Jiti Integration**: Runtime TypeScript execution for stub mode
- 🔄 **CITTY Compatible**: CLI framework integration for easy automation
- 🌍 **Multi-format Output**: Support for ESM, CJS, IIFE, and UMD

## Quick Start

### Installation

```bash
npm install -D @funish/build
```

### Basic Usage

```bash
# Build with config file
isbuild

# Build specific entry
isbuild src/index.ts

# Build multiple entries
isbuild src/index.ts src/cli.ts

# Generate stubs
isbuild --stub src/index.ts

# With options
isbuild src/index.ts --format esm --minify --dts
```

### CLI Options

```bash
Options:
  _                    Entry files
  --cwd <path>         Project directory (default: ".")
  --stub               Generate stub files
  --format <format>    Output format: esm, cjs, iife, umd
  --minify             Minify output
  --dts                Generate type declarations
  --out-dir <dir>      Output directory
  --clean              Clean output before build (default: true)
  --external <mods>    External dependencies (comma-separated)
  --watch              Watch mode
  --config <path>      Path to config file
  --no-config          Disable config file
```

## Configuration

### Using `build.config.ts`

```typescript
import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      entry: "src/index",
      minify: true,
    },
    {
      entry: "src/cli/**/*",
      outDir: "dist/cli/",
    },
  ],
});
```

### Using `vite.config.ts` (Fallback)

When no `build.config.ts` is found, @funish/build automatically reads `pack` config from `vite.config.ts`:

```typescript
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/cli/**/*"],
    minify: true,
  },
});
```

This enables seamless integration with Vite+ — use `vp pack` for production builds and `isbuild --stub` (or `basis build --stub`) for development stubs, all from the same configuration.

See [tsdown documentation](https://tsdown.dev) for all available options.

## Stub Mode

Generate lightweight development stubs with Jiti for fast iteration:

```bash
# Via isbuild CLI
isbuild --stub

# Via basis CLI (reads pack.entry from vite.config.ts)
basis build --stub
```

Stub files use Jiti to load source TypeScript files at runtime, eliminating the need to rebuild during development.

## Integration with Basis CLI

@funish/build integrates seamlessly with [@funish/basis](https://github.com/funish/basis):

```bash
basis build --stub           # Generate stubs from vite.config.ts pack config
```

## API

### `build(options)`

```typescript
import { build } from "@funish/build";

await build({
  cwd?: string;
  entries: (BuildEntry | string)[];
  hooks?: {
    start?: (ctx: BuildContext) => void | Promise<void>;
    end?: (ctx: BuildContext) => void | Promise<void>;
  };
});
```

`BuildEntry` extends [tsdown's InlineConfig](https://tsdown.dev) with:

- `stub?: boolean` - Generate Jiti stub instead of bundling

### `defineBuildConfig(config)`

```typescript
import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [...],
});
```

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
