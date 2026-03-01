# @funish/basis

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)
[![npm downloads](https://img.shields.io/npm/dm/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)

> A modern development toolkit with unified CLI for package management, versioning, publishing, code quality, and Git workflow automation.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is Basis?

Basis is your **unified development toolkit** for modern projects. Instead of juggling multiple CLI tools, Basis provides a single interface for all your development workflow needs.

## Features

- 🎯 **Unified CLI**: One command interface for all development tasks
- 📦 **Package Management**: Add, remove dependencies with auto-detected package manager (npm, yarn, pnpm, bun, deno)
- 🏷️ **Version Management**: Semantic versioning with automated git tagging
- 🚀 **Publishing**: Flexible publishing with tag strategy
- 🔍 **Code Quality**: Linting, formatting, and type checking
- 🛠️ **Project Audit**: Dependency and structure validation
- 🪪 **Smart Git Hooks**: Automatic git hook management and commit message validation
- 💻 **Direct TS Execution**: Run TypeScript files directly without compilation
- 🔧 **Single Configuration**: One config file for all functionality

## Quick Start

### Installation

```bash
# Install globally (recommended)
pnpm add -g @funish/basis
npm install -g @funish/basis

# Or use directly without installation
npx @funish/basis init
```

### Initialize

```bash
cd your-project
basis init

# This creates:
# ✅ basis.config.ts with Git hooks
# ✅ Git hooks setup (run 'basis git setup' to activate)
```

## CLI Commands

### Code Quality

```bash
# Lint code
basis lint

# Format code
basis fmt

# Type check
basis check

# Build project
basis build

# Audit code quality
basis audit                    # Run all audits
basis audit --dependencies     # Audit dependencies only
basis audit --structure        # Audit structure only
```

### Package Management

```bash
# Add dependencies
basis add lodash
basis add -D typescript

# Remove dependencies
basis remove lodash

# Execute package without installation
basis dlx prettier --write .
```

### Run Scripts or Files

```bash
# Run package.json scripts
basis run dev
basis run build

# Run TypeScript/JavaScript files directly
basis run src/index.ts
basis run scripts/setup.js
```

### Version Management

```bash
# Semantic version increments
basis version patch        # 1.0.0 → 1.0.1
basis version minor        # 1.0.0 → 1.1.0
basis version major        # 1.0.0 → 2.0.0

# Prerelease versions
basis version prerelease        # 1.0.0 → 1.0.1-edge.0
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

### Git Operations

```bash
# Setup Git hooks
basis git setup            # Install hooks from config

# Check staged files
basis git staged

# Validate commit message
basis git lint-commit

# Git passthrough
basis git status
basis git log --oneline
```

## Configuration

Basis uses a single configuration file for all features:

```ts
// basis.config.ts
import { defineBasisConfig } from "@funish/basis/config";

export default defineBasisConfig({
  // Linting configuration (oxlint)
  lint: {},

  // Formatting configuration (oxfmt)
  fmt: {},

  // Git configuration
  git: {
    // Git hooks
    hooks: {
      "pre-commit": "basis git staged",
      "commit-msg": "basis git lint-commit",
    },

    // Staged files check (lint-staged style)
    staged: {
      rules: {
        "*.{ts,tsx,js,jsx}": "basis lint --fix",
        "*.{json,md,yml,yaml}": "basis fmt --write",
      },
    },

    // Commit message validation
    commitMsg: {
      types: ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
      maxLength: 72,
      minLength: 10,
    },
  },

  // Run configuration (jiti)
  run: {},

  // Audit configuration
  audit: {
    dependencies: {
      outdated: true,
      security: true,
      licenses: {
        allowed: ["MIT", "Apache-2.0", "BSD-3-Clause"],
        blocked: ["GPL"],
      },
      blocked: ["bad-package"],
    },
    structure: {
      required: ["README.md", "LICENSE"],
      files: [
        {
          pattern: "src/**/*.ts",
          rule: "^[a-z][a-z0-9-]*\\.ts$",
          message: "Files should use kebab-case",
        },
      ],
      dirs: [
        {
          pattern: "src/*/",
          rule: "^[a-z][a-z0-9-]*$",
          message: "Directories should use kebab-case",
        },
      ],
    },
  },

  // Version configuration
  version: {
    preid: "edge",
  },

  // Publishing configuration
  publish: {
    tag: "latest",
    git: {
      tagPrefix: "v",
      message: (version) => `chore: release v${version}`,
      push: true,
      signTag: false,
    },
  },
});
```

## Publishing Strategy

Basis uses intelligent tag detection based on version:

- **Stable** (1.0.0): Published to `latest` + `edge`
- **Prerelease** (1.0.0-beta.1): Published to `beta` + `edge`
- **Custom tag**: Use `--tag` to override

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
