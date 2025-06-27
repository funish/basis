# @funish/basis

![GitHub](https://img.shields.io/github/license/funish/basis)
[![npm version](https://img.shields.io/npm/v/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)
[![npm downloads](https://img.shields.io/npm/dm/@funish/basis.svg)](https://www.npmjs.com/package/@funish/basis)

> A unified development toolkit with CLI for package management, versioning, publishing, linting, and git hooks management for JavaScript/TypeScript projects.

**🧑‍💻 Contributing?** See the [monorepo documentation](https://github.com/funish/basis) for development setup and contribution guidelines.

## What is Basis?

Basis is your **unified development toolkit** for modern JavaScript/TypeScript projects. Instead of juggling multiple CLI tools, Basis provides a single interface for all your development workflow needs.

## Features

- 🎯 **Unified CLI**: One command interface for all development tasks
- 📦 **Package Management**: Install, add, remove dependencies with auto-detected package manager (npm, yarn, pnpm, bun, deno)
- 🏷️ **Version Management**: Semantic versioning with automated git tagging and releases
- 🚀 **Publishing**: Multi-tag publishing strategy with edge version tracking
- 🔧 **Tool Agnostic Linting**: Not tied to specific linters - use ESLint, Oxlint, Biome, or any tool you prefer
- 🪝 **Smart Git Hooks**: Automatic git repository initialization and hook management
- 💻 **Modern Stack**: Built on the unjs ecosystem (citty, consola, c12, nypm, semver)
- 💪 **TypeScript First**: Full TypeScript support with excellent DX
- 📚 **Smart Defaults**: Best practices built-in, fully customizable
- 🔧 **Single Configuration**: One config file for all functionality

## Quick Start

### Recommended Installation (Global with pnpm)

```bash
# Install globally with pnpm (recommended)
pnpm add -g @funish/basis

# Or install globally with npm
npm install -g @funish/basis

# Verify installation
basis --version
```

### Alternative Installation Methods

```bash
# Install in your project with pnpm
pnpm add -D @funish/basis

# Or with npm
npm install -D @funish/basis

# Or use directly without installation
npx @funish/basis init
```

### Initialize in Existing Project

```bash
cd your-existing-project
basis init

# Interactive setup will ask you to:
# 📁 Choose config format (.ts/.mjs/.cjs) - auto-detected based on your project
# 🔧 Optionally setup Git hooks and configuration

# Your project now has:
# ✅ Configuration file with Git hooks that adapt to your package manager
# ✅ Git hooks setup (if selected during init)
# ✅ Tool-agnostic linting workflow
# ✅ Package management through unified CLI
# ✅ Version management with semantic versioning
# ✅ Publishing workflow with multi-tag strategy
```

## CLI Commands

### Package Management

```bash
# Install dependencies (auto-detects package manager)
basis install              # or basis i
basis install --frozen-lockfile

# Add dependencies
basis add lodash           # Add to dependencies
basis add -D typescript    # Add to devDependencies
basis add --workspace app react  # Add to specific workspace
basis add -g @funish/basis # Install globally

# Remove dependencies
basis remove lodash        # or basis rm / basis uninstall
basis remove -D typescript

# Run scripts
basis run build            # Run package.json scripts
basis run test --silent
```

### Version Management

```bash
# Semantic version increments
basis version patch        # 1.0.0 → 1.0.1
basis version minor        # 1.0.0 → 1.1.0
basis version major        # 1.0.0 → 2.0.0

# Prerelease versions
basis version --prerelease        # 1.0.0 → 1.0.1-edge.0
basis version --prerelease --preid beta  # 1.0.0 → 1.0.1-beta.0

# Specific version
basis version 2.0.0

# Custom commit message
basis version patch --message "fix: critical bug"
```

### Publishing

```bash
# Standard publishing (to edge tag)
basis publish

# Stable release (to latest + edge tags)
basis publish --stable

# Custom tag publishing (to custom + edge tags)
basis publish --tag beta
basis publish --tag alpha

# Dry run
basis publish --dry-run

# Skip build/tests
basis publish --skip-build --skip-tests
```

### Linting

```bash
# Lint staged files
basis lint --staged

# Run project-wide linting
basis lint --project

# Check dependencies
basis lint --deps

# Check project structure
basis lint --structure

# Check documentation
basis lint --docs

# Run all lint checks
basis lint --all
```

### Git Hooks Management

```bash
# Setup git configuration and hooks
basis git setup

# Setup git configuration only
basis git config

# Setup git hooks only
basis git hooks

# Remove git hooks
basis git remove                         # Remove all basis-managed hooks
basis git remove pre-commit             # Remove specific hook
basis git remove --update-config        # Remove hooks AND config from basis.config.ts

# Reset git configuration
basis git reset                          # Reset config (keep user info)
basis git reset --no-keep-user          # Reset config (remove user info)
basis git reset --update-config         # Reset config AND remove from basis.config.ts

# Initialize git repository with basis configuration
basis git init

# Validate commit message
basis git --lint-commit
```

### Project Management

```bash
# Initialize configuration
basis init                     # Initialize basis configuration (interactive)
basis init --force            # Overwrite existing configuration
basis init --skip-git-check   # Skip git directory check
basis init --skip-install     # Skip dependency installation

# Interactive setup will:
# 1. Auto-detect recommended config format (.ts/.mjs/.cjs)
# 2. Ask you to choose your preferred format
# 3. Offer to setup Git hooks and configuration

# Configuration
basis config                   # Show current configuration
basis config --json           # Output configuration as JSON
basis config --path           # Show configuration file path

# Help
basis --help                   # Show help
basis <command> --help         # Show command-specific help
```

## Configuration

Basis uses a single configuration file for all its features. The `basis init` command creates a configuration file with customized Git hooks in your preferred format:

```ts
// basis.config.ts (TypeScript) or basis.config.mjs (ES Module)
import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  // Configure your project here
  // See: https://github.com/funish/basis/tree/main/packages/basis#configuration
  git: {
    hooks: {
      "pre-commit": "pnpm exec basis lint --staged", // Auto-adapts to your package manager
      "commit-msg": "pnpm exec basis git --lint-commit",
    },
  },
});
```

```cjs
// basis.config.cjs (CommonJS)
const { defineBasisConfig } = require("@funish/basis");

module.exports = defineBasisConfig({
  // Configure your project here
  // See: https://github.com/funish/basis/tree/main/packages/basis#configuration
  git: {
    hooks: {
      "pre-commit": "npx basis lint --staged", // Auto-adapts to your package manager
      "commit-msg": "npx basis git --lint-commit",
    },
  },
});
```

> **💡 Configuration**: The generated config file only shows the Git hooks that are customized for your package manager. All other configuration options use smart defaults and can be added as needed.

### Full Configuration Example

Here's a complete configuration with all available options:

```ts
// basis.config.ts
import { defineBasisConfig } from "@funish/basis";

export default defineBasisConfig({
  // Linting configuration
  lint: {
    // Staged files linting patterns
    staged: {
      "*.{ts,tsx,js,jsx}": "pnpm eslint --fix",
      "*.{json,md,yml,yaml}": "pnpm prettier --write",
      "*.vue": "pnpm vue-tsc --noEmit && pnpm eslint --fix",
    },
    // Project-wide linting commands
    project: {
      typecheck: "pnpm tsc --noEmit",
      "format-check": "pnpm prettier --check .",
    },
  },

  // Git configuration
  git: {
    // Hook commands
    hooks: {
      "pre-commit": "pnpm exec basis lint --staged",
      "commit-msg": "pnpm exec basis git --lint-commit",
    },

    // Commit message validation
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
      ],
      maxLength: 72,
      minLength: 10,
      scopeRequired: false,
      allowedScopes: ["api", "ui", "core"],
    },

    // Options
    autoInitGit: true, // Auto-initialize git repo if not found
    skipGitCheck: false, // Skip git command availability check
    force: false, // Force operation even if git unavailable
  },

  // Package manager configuration (auto-detected)
  packageManager: {
    autoDetect: true, // Auto-detect package manager
    registry: "https://registry.npmjs.org/",
  },

  // Version management configuration
  version: {
    tagPrefix: "v", // Git tag prefix
    autoCommit: true, // Auto commit version changes
    autoTag: true, // Auto create git tag
    autoPush: false, // Manual push control
    prereleaseId: "edge", // Default prerelease identifier
    commitMessage: "chore: release v{version}",
  },

  // Publishing configuration
  publish: {
    defaultTag: "edge", // Always published tag
    stableTag: "latest", // Stable release tag
    access: "public", // Package access level
    registry: "https://registry.npmjs.org/",
    buildCommand: "pnpm build", // Build before publish
    testCommand: "pnpm test", // Test before publish
    checkGitClean: true, // Check git status before publish
    checkTests: true, // Run tests before publish
    autoGitPush: true, // Push after publish
    createGitTag: true, // Create git tag after publish
  },
});
```

## Publishing Strategy

Basis implements an intelligent multi-tag publishing strategy:

### Tag Types

- **`edge`**: Always points to the latest published version (any type)
- **`latest`**: Points to stable releases
- **Prerelease Tags**: `alpha`, `beta`, `rc` versions get their own tags
- **Custom Tags**: Flexible tagging for different release channels

### Examples

```bash
# Version 1.0.0 (stable)
basis publish --stable
# → Published to: latest + edge

# Version 1.1.0-beta.1 (prerelease)
basis publish
# → Published to: beta + edge

# Version 1.2.0 (custom workflow)
basis publish --tag canary
# → Published to: canary + edge
```

### Installation Examples

```bash
# Install stable version
pnpm add @funish/basis        # Gets latest tag

# Install edge version (latest published)
pnpm add @funish/basis@edge

# Install prerelease
pnpm add @funish/basis@beta

# Install specific version
pnpm add @funish/basis@1.0.0
```

## Core Concepts

### 🎯 **Unified CLI**

Single command interface for package management, versioning, publishing, linting, and git hooks. No more switching between different tools.

### 📦 **Auto-Detected Package Manager**

Basis automatically detects your preferred package manager (npm, yarn, pnpm, bun, deno) and uses the appropriate commands, powered by [nypm](https://github.com/unjs/nypm).

### 🏷️ **Semantic Versioning**

Built-in semantic versioning support using the standard [semver](https://www.npmjs.com/package/semver) package, with automated git tagging and commit generation.

### 🔧 **Tool Agnostic**

Basis doesn't force specific tools. Use ESLint, Oxlint, Biome, or any other linter. Basis orchestrates your existing tools, doesn't replace them.

### 📦 **Modern Foundations**

Built on the [unjs ecosystem](https://unjs.io/), leveraging proven tools like `citty`, `consola`, `c12`, `nypm`, and `semver` for maximum reliability and performance.

## Integration

Basis integrates seamlessly with:

- **Package Managers**: npm, yarn, pnpm, bun, deno (auto-detected)
- **Linters**: ESLint, Oxlint, Biome, Prettier, StyleLint
- **Git**: Works with any git workflow and hosting provider
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Frameworks**: React, Vue, Angular, Next.js, Nuxt, SvelteKit

## Why Choose Basis?

### Instead of juggling multiple tools:

```bash
npm install package          # Package management
yarn version patch           # Version management
npm publish --tag beta       # Publishing
npx lint-staged             # Linting
git config --global ...     # Git configuration
```

### Use one unified command:

```bash
basis add package           # Unified package management
basis version patch         # Unified version management
basis publish --tag beta   # Unified publishing
basis lint --staged        # Unified linting
basis git setup            # Unified git setup
```

## API

```ts
import {
  createBasis,
  defineBasisConfig,
  // Import module functions directly for maximum flexibility
  init,
  setupGit,
  lintAll,
  updatePackageVersion,
  publishPackage,
} from "@funish/basis";

// Programmatic usage with Basis class (for config caching and workflows)
const basis = createBasis(process.cwd());

// High-level workflows
await basis.setup({ force: false, skipGitCheck: false, skipInstall: false }); // init + git setup
await basis.release({ patch: true }, { stable: true }); // lint + version + publish

// Configuration management
const config = await basis.getConfig(); // Cached config loading
await basis.reloadConfig(); // Force reload
basis.setCwd("/different/path"); // Change working directory

// Or use module functions directly for more control
const cwd = process.cwd();
await init(cwd, { force: true });
await setupGit(cwd);
await lintAll(cwd);
await updatePackageVersion(cwd, { patch: true });
await publishPackage(cwd, { stable: true });
```

## License

[MIT](../../LICENSE) © [Funish](https://funish.net/)
