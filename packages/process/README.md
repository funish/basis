# @funish/process

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/process.svg)](https://www.npmjs.org/package/@funish/process)

> Cross-platform process execution with intelligent shell detection for Windows PowerShell.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is @funish/process?

@funish/process is a **thin wrapper** around Node.js `child_process` that automatically detects and uses the appropriate shell on Windows. It solves the common issue where PowerShell-installed tools (like `bun` or `pnpm`) aren't found when executing commands from Node.js on Windows.

## Features

- 🪄 **Auto-detects PowerShell**: Uses `powershell.exe` on Windows when running in PowerShell environment
- 🌍 **Cross-platform**: Works seamlessly on Windows, macOS, and Linux
- 📦 **Zero Breaking Changes**: Exports the same API as `node:child_process`
- 🎯 **TypeScript First**: Full TypeScript support with proper types
- ⚡ **Lightweight**: Minimal bundle size with only `std-env` as dependency

## Quick Start

### Installation

```bash
npm install @funish/process
```

### Basic Usage

```typescript
import { execSync } from "@funish/process";

// Simple execution (auto-detects shell on Windows)
const output = execSync("bun --version", { encoding: "utf8" });
console.log(output.trim()); // "1.2.3"

// With options
execSync("npm install", { cwd: "./project", stdio: "inherit" });

// With explicit shell
execSync("ls -la", { shell: "/bin/bash" });
```

## How It Works

`@funish/process` automatically detects your shell environment on Windows:

| Platform   | Environment         | Shell Used                 |
| ---------- | ------------------- | -------------------------- |
| Windows    | PowerShell detected | `powershell.exe`           |
| Windows    | cmd/other           | System default (`cmd.exe`) |
| Unix/macOS | any                 | System default (`/bin/sh`) |

PowerShell detection uses:

- `PSModulePath` environment variable
- `PROMPT` environment variable (starts with "PS")
- TTY detection (non-TTY implies PowerShell)

This ensures commands installed in PowerShell work correctly, regardless of where they're installed.

## Comparison

### Node.js `execSync`

```typescript
// ❌ Might not find bun on Windows PowerShell
import { execSync } from "node:child_process";
execSync("bun install", { stdio: "inherit" });
// Error: spawn bun ENOENT
```

### @funish/process

```typescript
// ✅ Works everywhere
import { execSync } from "@funish/process";
execSync("bun install", { stdio: "inherit" });
// Uses PowerShell on Windows, finds bun correctly
```

## API

### `execSync(command, options?)`

Enhanced version of `child_process.execSync` with automatic shell detection.

**Type:**

```typescript
function execSync(command: string, options?: ExecSyncOptions): string | Buffer;
```

**Parameters:**

- `command`: Command string to execute
- `options`: Same as Node.js `ExecSyncOptions`
  - `cwd`: Working directory
  - `env`: Environment variables
  - `encoding`: Output encoding (default: `"buffer"`)
  - `shell`: Override auto-detected shell
  - `stdio`: stdio configuration

**Returns:** Command stdout as `string` (if encoding specified) or `Buffer`

### `detectShell()`

Detect the appropriate shell for the current environment.

**Type:**

```typescript
function detectShell(): string | undefined;
```

**Returns:**

- `powershell.exe` on Windows when PowerShell is detected
- `undefined` to use system default shell otherwise

## Re-exports

All exports from `node:child_process` are re-exported:

```typescript
import {
  execSync, // Enhanced with shell detection
  spawn, // Original Node.js spawn
  spawnSync, // Original Node.js spawnSync
  exec, // Original Node.js exec
  // ... and all other child_process exports
} from "@funish/process";
```

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
