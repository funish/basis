# Funish Basis

![GitHub](https://img.shields.io/github/license/funish/basis)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

> A modern development toolkit with unified CLI for package management, versioning, publishing, code quality, and Git workflow automation.

**Similar to**: [Vite+](https://viteplus.dev/) - Basis follows the same philosophy of unified tooling with Rust-powered components (oxlint/oxfmt) for maximum performance.

## Packages

- **[@funish/basis](./packages/basis/README.md)** - Unified CLI toolkit for development workflows: package management, versioning, publishing, code quality, and Git automation
- **[@funish/build](./packages/build/README.md)** - Modern build system powered by tsdown (Rolldown + Oxc) with Jiti stub support

## Quick Start

```bash
# Install with npm
$ npm install -D @funish/basis

# Install with yarn
$ yarn add -D @funish/basis

# Install with pnpm
$ pnpm add -D @funish/basis

# Install globally (optional)
$ pnpm add -g @funish/basis

# Initialize in your project
basis init

# Use commands
basis add lodash
basis lint
basis version patch
basis publish
```

```typescript
// basis.config.ts
import { defineBasisConfig } from "@funish/basis/config";

export default defineBasisConfig({
  lint: {
    config: ["--fix", "--fix-suggestions", "--type-aware", "--type-check"],
  },
  fmt: {
    config: ["--write", "."],
  },
  git: {
    hooks: {
      "pre-commit": "pnpm basis git staged",
      "commit-msg": "pnpm basis git lint-commit",
    },
    staged: {
      rules: {
        "**/*.{ts,tsx,js,jsx}": "basis lint",
        "**/*.{json,md,yml,yaml}": "basis fmt",
      },
    },
  },
});
```

## Development

### Prerequisites

- **Node.js** 18.x or higher
- **pnpm** 9.x or higher
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

3. **Development mode**:

   ```bash
   pnpm dev
   ```

4. **Build all packages**:

   ```bash
   pnpm build
   ```

5. **Test locally**:

   ```bash
   # Link the package globally
   cd packages/basis
   pnpm link --global

   # Test your changes
   basis --version
   ```

### Development Commands

```bash
pnpm dev            # Development mode with watch
pnpm build          # Build all packages
pnpm lint           # Run linting
```

## Contributing

We welcome contributions!

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/basis.git`
3. **Install**: `pnpm install`
4. **Develop**: `pnpm dev`
5. **Test**: `pnpm build && basis <your-command>`
6. **Commit**: Use conventional commits (`feat:`, `fix:`, etc.)
7. **Push** to your fork and create a Pull Request

## Support & Community

- 📫 [Report Issues](https://github.com/funish/basis/issues)
- 💬 [Discussions](https://github.com/funish/basis/discussions)
- 📚 [Documentation](./packages/basis/README.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [Funish](https://funish.net/)
