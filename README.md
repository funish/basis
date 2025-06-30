# Funish Basis

![GitHub](https://img.shields.io/github/license/funish/basis)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

> Monorepo for @funish/basis - A unified development toolkit with CLI for package management, versioning, publishing, linting, and git hooks management for JavaScript/TypeScript projects.

## About This Project

This is the monorepo for **@funish/basis**, a modern development toolkit that unifies common development workflows into a single CLI. Instead of juggling multiple tools for package management, versioning, publishing, linting, and git hooks, Basis provides one interface for everything.

**👤 User?** Looking to use @funish/basis? Check out the [package documentation](./packages/basis/README.md) or install directly:

```bash
# Install globally with pnpm (recommended)
pnpm add -g @funish/basis

# Quick start
basis init
```

**🧑‍💻 Developer?** Welcome! This document is for you. Keep reading to learn how to contribute to this project.

## What is Basis?

Basis is a unified CLI toolkit that provides:

- 📦 **Package Management**: Auto-detected package manager support (npm, yarn, pnpm, bun, deno)
- 🏷️ **Version Management**: Semantic versioning with automated git tagging
- 🚀 **Publishing**: Multi-tag publishing strategy with edge version tracking
- 🔧 **Linting**: Tool-agnostic linting workflow
- 🪝 **Git Hooks**: Smart git hooks management
- 💻 **Modern Architecture**: Built on unjs ecosystem (citty, consola, c12, nypm, semver)

## Repository Structure

```
basis/
├── packages/
│   └── basis/                   # Main @funish/basis package
│       ├── src/
│       │   ├── cli.ts           # CLI entry point
│       │   ├── commands/        # CLI command implementations
│       │   │   ├── install.ts   # Package installation (nypm)
│       │   │   ├── add.ts       # Add dependencies (nypm)
│       │   │   ├── remove.ts    # Remove dependencies (nypm)
│       │   │   ├── run.ts       # Run scripts (nypm)
│       │   │   ├── version.ts   # Version management (semver)
│       │   │   ├── publish.ts   # Publishing workflow
│       │   │   ├── lint.ts      # Linting coordination
│       │   │   ├── git.ts       # Git management with subcommands
│       │   │   ├── init.ts      # Project initialization
│       │   │   └── config.ts    # Configuration management
│       │   ├── modules/         # Core business logic
│       │   │   ├── version.ts   # Version management logic
│       │   │   ├── publish.ts   # Publishing logic
│       │   │   ├── git.ts       # Git hooks and config implementation
│       │   │   ├── lint.ts      # Linting implementation
│       │   │   └── init.ts      # Initialization logic
│       │   ├── config.ts        # Configuration system (c12)
│       │   ├── types.ts         # TypeScript type definitions
│       │   └── utils.ts         # Shared utilities
│       ├── package.json         # Package manifest
│       ├── build.config.ts      # Build configuration (unbuild)
│       └── README.md            # User documentation
├── package.json                 # Monorepo configuration
├── pnpm-workspace.yaml          # pnpm workspace configuration
├── tsconfig.json                # TypeScript configuration
├── basis.config.ts              # Self-hosting configuration
└── README.md                    # This file (development documentation)
```

## Development Setup

### Prerequisites

- **Node.js** 18.x or higher
- **pnpm** 9.x or higher (this project uses pnpm as the package manager)
- **Git** for version control

### Getting Started

1. **Clone the repository**:

   ```bash
   git clone https://github.com/funish/basis.git
   cd basis
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Build packages**:

   ```bash
   pnpm build
   ```

4. **Development mode** (watch and rebuild):

   ```bash
   pnpm dev
   ```

5. **Test the CLI locally**:

   ```bash
   # Link the package globally for testing
   cd packages/basis
   pnpm link --global

   # Now you can use 'basis' command anywhere
   basis --version
   ```

### Development Commands

```bash
pnpm dev            # Watch and rebuild (recommended for development)
pnpm build          # Build all packages for production
pnpm lint          # Run code formatting and linting
```

## Architecture & Design Principles

### 🏗️ **Modular Architecture**

The codebase is organized into clear layers:

- **Commands** (`src/commands/`): CLI interface using citty
- **Modules** (`src/modules/`): Business logic implementation
- **Configuration** (`src/config.ts`): Unified config system using c12
- **Types** (`src/types.ts`): TypeScript definitions
- **Utilities** (`src/utils.ts`): Shared helper functions

### 🔧 **Technology Choices**

- **[citty](https://github.com/unjs/citty)**: Modern CLI framework for command structure
- **[consola](https://github.com/unjs/consola)**: Elegant console logging
- **[c12](https://github.com/unjs/c12)**: Universal configuration loader
- **[nypm](https://github.com/unjs/nypm)**: Universal package manager interface
- **[semver](https://www.npmjs.com/package/semver)**: Semantic versioning utilities
- **[pkg-types](https://github.com/unjs/pkg-types)**: Package.json utilities
- **[pathe](https://github.com/unjs/pathe)**: Universal path utilities
- **[micromatch](https://github.com/micromatch/micromatch)**: Pattern matching for linting

### 📝 **Configuration System**

Uses c12 for powerful configuration loading with:

- TypeScript support
- Environment-based overrides
- Schema validation
- Unified configuration file (`basis.config.ts`)

### 🚀 **Publishing Strategy**

Multi-tag publishing approach:

- **`edge`**: Always points to latest published version
- **`latest`**: Stable releases only
- **`alpha/beta/rc`**: Prerelease channels
- **Custom tags**: Flexible workflow support

## Contributing

We welcome contributions! Here's how to get started:

### Quick Setup

```bash
# Clone and setup
git clone https://github.com/funish/basis.git
cd basis
pnpm install
pnpm dev

# Test your changes
cd packages/basis && pnpm link --global
basis --version
```

### Development Workflow

1. **Code**: Follow our standards in [CONTRIBUTING.md](./CONTRIBUTING.md)
2. **Test**: `pnpm build && basis <your-command>`
3. **Commit**: Use conventional commits (`feat:`, `fix:`, etc.)
4. **Submit**: Create a Pull Request

> 📋 **For detailed guidelines, principles, and best practices**, see our [Contributing Guide](./CONTRIBUTING.md).

## Release Process

This project uses itself for version management and publishing:

```bash
# Create a new version
basis version patch    # or minor/major

# Publish to npm
basis publish --stable  # for stable release
basis publish           # for edge release
```

### Version Strategy

- **Patch**: Bug fixes, small improvements
- **Minor**: New features, backwards compatible
- **Major**: Breaking changes
- **Prerelease**: Alpha/beta releases with `basis version --prerelease`

## Self-Hosting

This monorepo uses its own basis configuration:

```ts
// basis.config.ts
export default defineBasisConfig({
  git: {
    hooks: {
      "pre-commit": "basis lint --staged",
      "commit-msg": "basis git lint-commit",
    },
    config: {
      core: {
        autocrlf: "input",
      },
    },
    autoInitGit: true,
  },
  lint: {
    staged: {
      "*.{ts,js,json}": "pnpm oxlint --fix --fix-suggestions",
    },
  },
  version: {
    tagPrefix: "v",
    autoCommit: true,
    autoTag: true,
    autoPush: false,
  },
  publish: {
    defaultTag: "edge",
    stableTag: "latest",
    checkGitClean: true,
    checkTests: true,
  },
});
```

## Project Philosophy

Basis follows core principles that guide its design and development:

1. **Unified Interface**: One CLI for all development tasks
2. **Tool Agnostic**: Don't replace tools, orchestrate them
3. **Auto-Detection**: Minimize configuration, maximize convenience
4. **Modern Stack**: Built on proven unjs ecosystem
5. **Developer Experience**: Focus on productivity and simplicity
6. **Balanced Output**: Silent process with clear completion status

> 📋 **For detailed development principles and coding standards**, see our [Contributing Guide](./CONTRIBUTING.md).

### Why Unjs Ecosystem?

The [unjs ecosystem](https://unjs.io/) provides:

- **Consistency**: Similar APIs across tools
- **Quality**: Well-tested, maintained packages
- **Performance**: Optimized for speed and bundle size
- **Community**: Active development and support

## Support & Community

- 📫 [Report Issues](https://github.com/funish/basis/issues)
- 💬 [Discussions](https://github.com/funish/basis/discussions)
- 📚 [Documentation](./packages/basis/README.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [Funish](https://funish.net/) using the amazing [unjs ecosystem](https://unjs.io/)
