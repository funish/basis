# @funish/build

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/build.svg)](https://www.npmjs.org/package/@funish/build)

> Modern build system powered by tsdown with Jiti stub support.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is @funish/build?

@funish/build is a **zero-config build system** designed for modern TypeScript/JavaScript projects. It leverages [tsdown](https://tsdown.dev) for ultra-fast bundling and [Jiti](https://github.com/unjs/jiti) for development stub generation.

**Inspired by**: This project is inspired by [unbuild](https://github.com/unjs/unbuild) and adopts the stub implementation pattern with modern tooling.

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
- 🎨 **Shebang Support**: Automatic executable handling for CLI tools
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

Create `build.config.ts` in your project root:

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

See [tsdown documentation](https://tsdown.dev) for all available options.

## Stub Mode

Generate lightweight development stubs with Jiti for fast iteration:

```typescript
import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      entry: "src/commands/**/*",
      stub: true,
      outDir: "dist/commands/",
    },
  ],
});
```

Use `isbuild --stub` to generate stubs that load source files at runtime using Jiti.

## Integration with Basis CLI

@funish/build integrates seamlessly with [@funish/basis](https://github.com/funish/basis):

```bash
basis build
basis build --stub
basis build src/index.ts --minify
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
