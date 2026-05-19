# @funish/basis

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)
[![npm downloads](https://img.shields.io/npm/dm/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)

> Release workflow companion for Vite+ — versioning, publishing, commit validation, and stub mode.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is Basis?

Basis is a **release workflow companion** for [Vite+](https://viteplus.dev/). While Vite+ handles linting, formatting, building, and staged checks, Basis focuses on the remaining pieces of your development workflow: versioning, publishing, commit message validation, and development stub mode.

## Features

- 🏷️ **Version Management**: Semantic versioning with prerelease support
- 🚀 **Publishing**: Flexible npm publishing with tag strategy and git operations
- 🪪 **Commit Validation**: Conventional commit message validation via git hooks
- 🔧 **Stub Mode**: Development stubs using Jiti for instant iteration (reads from `vite.config.ts`)
- 🛠️ **Project Audit**: Dependency and structure validation with auto-fix

## Quick Start

### Installation

```bash
# Install with pnpm
$ pnpm add -D @funish/basis

# Install with npm
$ npm install -D @funish/basis
```

### Setup Git Hooks

```bash
# Install commit-msg hook for commit message validation
basis git setup
```

## CLI Commands

### Version Management

```bash
# Semantic version increments
basis version patch        # 1.0.0 → 1.0.1
basis version minor        # 1.0.0 → 1.1.0
basis version major        # 1.0.0 → 2.0.0

# Prerelease versions
basis version prerelease            # 1.0.0 → 1.0.1-edge.0
basis version prerelease --preid beta  # 1.0.0 → 1.0.1-beta.0

# Specific version
basis version 2.0.0
```

### Publishing

```bash
# Publish with tag detection
basis publish              # Auto-detect tag based on version
basis publish --tag beta   # Custom tag

# With git operations
basis publish --git        # Also create git tag and commit
```

### Build (Stub Mode)

```bash
# Generate development stubs (reads pack.entry from vite.config.ts)
basis build --stub

# Production builds use Vite+ directly
vp pack
```

### Git Operations

```bash
# Setup git hooks
basis git setup

# Validate commit message
basis git lint-commit
```

### Audit

```bash
# Run all audits
basis audit

# Specific audits
basis audit --dependencies  # Audit dependencies only
basis audit --structure     # Audit structure only
basis audit --fix           # Auto-fix issues
```

## Configuration

```ts
// basis.config.ts
import { defineBasisConfig } from "@funish/basis/config";

export default defineBasisConfig({
  // Release workflow (version + publish)
  release: {
    npm: {
      tag: "latest",
      additionalTag: "edge",
      access: "public",
    },
    git: {
      tagPrefix: "v",
      push: true,
    },
  },

  // Commit message validation
  git: {
    commitMsg: {
      types: [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
      maxLength: 72,
      minLength: 10,
    },
  },

  // Audit configuration
  audit: {
    dependencies: {
      outdated: true,
      security: true,
    },
  },
});
```

## Publishing Strategy

Basis uses intelligent tag detection based on version:

- **Stable** (1.0.0): Published to `latest` + `edge` (configurable)
- **Prerelease** (1.0.0-beta.1): Published to `beta` + `edge`
- **Custom tag**: Use `--tag` to override

## Relationship with Vite+

| Feature            | Tool                    |
| ------------------ | ----------------------- |
| Linting            | `vp check` (Vite+)      |
| Formatting         | `vp fmt` (Vite+)        |
| Production Build   | `vp pack` (Vite+)       |
| Staged Checks      | `vp staged` (Vite+)     |
| Version Management | `basis version`         |
| Publishing         | `basis publish`         |
| Commit Validation  | `basis git lint-commit` |
| Dev Stub Mode      | `basis build --stub`    |
| Project Audit      | `basis audit`           |

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
