# @funish/basis

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)
[![npm downloads](https://img.shields.io/npm/dm/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)

> A modern development toolkit with unified CLI for package management, versioning, publishing, code quality, and Git workflow automation.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is Basis?

Basis is your **unified development toolkit** for modern projects. Instead of juggling multiple CLI tools, Basis provides a single interface for all your development workflow needs.

**Similar to**: [Vite+](https://viteplus.dev/) - Basis follows the same philosophy of unified tooling with Rust-powered components (oxlint/oxfmt) for maximum performance.

## Features

- 🎯 **Unified CLI**: One command interface for all development tasks
- 📦 **Package Management**: Add, remove dependencies with auto-detected package manager (npm, yarn, pnpm, bun, deno)
- 🏷️ **Version Management**: Semantic versioning with automated git tagging
- 🚀 **Publishing**: Flexible publishing with tag strategy
- 🔍 **Code Quality**: Linting, formatting, and building
- 🛠️ **Project Audit**: Dependency and structure validation with auto-fix
- 🪪 **Smart Git Hooks**: Automatic git hook management and commit message validation
- 💻 **Direct TS Execution**: Run TypeScript files directly without compilation
- 🔧 **Single Configuration**: One config file for all functionality

## Quick Start

### Installation

```bash
# Install with npm
$ npm install -D @funish/basis

# Install with yarn
$ yarn add -D @funish/basis

# Install with pnpm
$ pnpm add -D @funish/basis

# Install globally (optional)
$ pnpm add -g @funish/basis

# Or use directly without installation
$ npx @funish/basis init
```

### Initialize

```bash
cd your-project
basis init

# Options
basis init --force           # Overwrite existing configuration
basis init --skip-git-check  # Skip git directory check
basis init --skip-install    # Skip dependency installation

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

# Build project
basis build                    # Build with default config
basis build --cwd ./packages   # Build specific directory
basis build --stub             # Generate stub files

# Audit code quality
basis audit                    # Run all audits
basis audit --dependencies     # Audit dependencies only
basis audit --structure        # Audit structure only
basis audit --fix              # Auto-fix issues
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

# Advanced prerelease
basis version premajor     # 2.0.0-alpha.0
basis version preminor     # 1.1.0-alpha.0
basis version prepatch     # 1.0.1-alpha.0

# Specific version
basis version 2.0.0

# Allow same version
basis version patch --allow-same-version
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

# Git passthrough (all other git commands)
basis git status
basis git log --oneline
basis git branch -a
```

## Configuration

```ts
// basis.config.ts
import { defineBasisConfig } from "@funish/basis/config";

export default defineBasisConfig({
  git: {
    hooks: {
      "pre-commit": "basis git staged",
      "commit-msg": "basis git lint-commit",
    },
    staged: {
      rules: {
        "*.{ts,tsx,js,jsx}": "basis lint --fix",
        "*.{json,md,yml,yaml}": "basis fmt --write",
      },
    },
  },
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

- **Stable** (1.0.0): Published to `latest` + `edge`
- **Prerelease** (1.0.0-beta.1): Published to `beta` + `edge`
- **Custom tag**: Use `--tag` to override

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
