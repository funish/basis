# @funish/build

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/build.svg)](https://www.npmjs.com/package/@funish/build)

> Modern build system powered by Rolldown with Jiti stub support and Oxc transformation.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is @funish/build?

@funish/build is a **zero-config build system** designed for modern TypeScript/JavaScript projects. It leverages Rolldown for ultra-fast bundling, Oxc for transformation, and Jiti for development stub generation.

**Inspired by**: This project is inspired by [obuild](https://github.com/objync/obuild) and adopts the stub implementation pattern from [unbuild](https://github.com/unjs/unbuild).

## Features

- ⚡ **Rolldown-powered**: Rust-based bundler for ultra-fast builds
- 🔧 **Zero Configuration**: Sensible defaults with optional customization
- 📦 **Three Build Modes**:
  - **Bundle**: Production bundling with code splitting
  - **Transform**: Individual file transformation with Oxc
  - **Stub**: Development stubs with Jiti for instant iteration
- 🎯 **TypeScript First**: Full TypeScript support with automatic type declarations
- 📝 **Jiti Integration**: Runtime TypeScript execution for stub mode
- 🔄 **CITTY Compatible**: CLI framework integration for easy automation
- 🎨 **Shebang Support**: Automatic executable handling for CLI tools

## Quick Start

### Installation

```bash
# Install with npm
$ npm install -D @funish/build

# Install with yarn
$ yarn add -D @funish/build

# Install with pnpm
$ pnpm add -D @funish/build
```

### Basic Usage

```bash
# Build with default config
isbuild

# Generate stubs for development
isbuild --stub

# Build specific directory
isbuild --dir ./packages/my-package
```

### Programmatic Usage

```typescript
import { build } from "@funish/build";

await build({
  entries: [
    {
      type: "bundle",
      input: ["src/index"],
      minify: true,
    },
  ],
});
```

## Configuration

Create `build.config.ts` in your project root:

```typescript
import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["src/index", "src/cli"],
      minify: true,
    },
    {
      type: "transform",
      input: "src/commands/",
      outDir: "dist/commands/",
    },
  ],
});
```

> See [src/types.ts](./src/types.ts) for full type definitions.

## Build Modes

### Bundle Mode

Production-ready bundling with tree-shaking and code splitting:

```typescript
{
  type: "bundle",
  input: ["src/index", "src/cli"],
  minify: true,
  // Pass options to Rolldown
  rolldown: {
    platform: "node",
  },
}
```

### Transform Mode

Transform individual files without bundling:

```typescript
{
  type: "transform",
  input: "src/commands/",
  outDir: "dist/commands/",
}
```

### Stub Mode

Generate lightweight development stubs with Jiti:

```typescript
{
  type: "bundle",
  input: "src/index",
  stub: true,
}
```

This creates lightweight stub files that use Jiti to load the source files at runtime:

```javascript
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const _module = await jiti.import("../src/index.ts");

export default _module?.default ?? _module;
export * from _module;
```

## Advanced Configuration

### Rolldown Options

Pass any Rolldown options through the `rolldown` field:

```typescript
{
  type: "bundle",
  input: "src/index",
  rolldown: {
    // Any Rolldown options here
    platform: "node",
  },
}
```

### Shebang Plugin

Automatically preserves shebang for CLI tools:

```typescript
// src/cli.ts
#!/usr/bin/env node
console.log("Hello!");
```

The shebang is preserved in the output, and the file is made executable.

## Integration with Basis CLI

@funish/build integrates seamlessly with [@funish/basis](https://github.com/funish/basis):

```bash
# Use basis build command
basis build

# Generate stubs
basis build --stub
```

## API Reference

### `build(options)`

Main build function.

```typescript
import { build } from "@funish/build";

await build({
  cwd?: string;
  entries?: BuildEntry[];
  external?: string[];
});
```

See [src/types.ts](./src/types.ts) for full type definitions.

### `defineBuildConfig(config)`

Configuration helper with TypeScript types.

```typescript
import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [...],
});
```

### `loadConfig(options)`

Load build configuration from files.

```typescript
import { loadConfig } from "@funish/build/config";

const { config } = await loadConfig({
  cwd: process.cwd(),
});
```

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
