# Contributing to Basis

> Development guidelines for the Basis project

## Core Principles

### Keep It Simple

- Avoid over-engineering
- Prefer direct approaches over abstractions
- Question complexity: if it feels complex, reconsider

### Don't Repeat Yourself

- Extract common logic into reusable functions
- Apply consistent patterns to similar problems

### Clean Output

- Silent intermediate steps
- Clear final status for important operations
- Show critical results users need to know
- Use appropriate log levels for different situations

```javascript
// ✅ Good - Direct and clear
consola.success(`Version updated: ${oldVersion} → ${newVersion}`);
consola.error("Failed to build:", error);
consola.info("Processing files...");

// ❌ Bad - Verbose and unnecessary
consola.start("Step 1...");
consola.success("Step 1 done!");
consola.start("Step 2...");
consola.success("Step 2 done!");
```

**Consola Best Practices:**

```javascript
// ✅ Use specific log types
consola.start("Building project..."); // Beginning of an operation
consola.success("Build completed!"); // Successful completion
consola.error("Build failed:", error); // Errors with context
consola.info("Processing files..."); // Informational messages
consola.warn("Deprecated feature"); // Warnings

// ✅ Use tags for module identification
const logger = consola.withTag("[module-name]");
logger.info("Module specific message");

// ✅ Use colors for emphasis (when needed)
import { colors as c } from "consola/utils";
consola.info(`${c.magenta("[stub]")} Creating stub for ${path}`);

// ❌ Avoid manual emoji and verbose formatting
consola.log("📦 Building project..."); // Use consola.start instead
consola.log("✅ Success!"); // Use consola.success instead
```

### Consistent Patterns

- Uniform module structure
- Standard error handling
- Familiar CLI conventions

## Code Standards

- **TypeScript**: Use explicit types, avoid `any`
- **Functions**: Single responsibility, clear naming, explicit exports
- **Errors**: Graceful degradation, clear messages
- **Tests**: Focus on critical paths and edge cases

### Function Exports

All utility functions should be explicitly exported for reusability:

```typescript
// ✅ Good - Explicit exports
export function fmtPath(path: string): string {
  return resolve(path).replace(process.cwd(), ".");
}

export function hasGlob(path: string): boolean {
  return path.includes("*") || path.includes("?");
}

// Internal helpers can also be exported if useful
export async function makeExecutable(filePath: string): Promise<void> {
  await chmod(filePath, 0o755);
}

// ❌ Bad - Missing exports
function fmtPath(path: string): string {
  // Not reusable
  return resolve(path).replace(process.cwd(), ".");
}
```

### Error Messages

Keep error messages clear, concise, and actionable:

```typescript
// ✅ Good - Clear and specific
consola.error("Package name required");
consola.info("Example: basis add lodash");

consola.error("Failed to add packages:", error);
consola.error(`Failed to run script "${name}":`, error);

// ❌ Bad - Verbose and unclear
consola.error("Please specify at least one package name"); // Too long
consola.error("An error occurred while trying to add the packages"); // Not actionable
```

### Code Organization

```typescript
// ✅ Good - Clear structure, single responsibility
export async function addCommand({ args, rawArgs }) {
  const packages = parsePackages(rawArgs);
  if (packages.length === 0) {
    consola.error("Package name required");
    process.exit(1);
  }

  try {
    await addDependency(packages);
    consola.success(`Added ${packages.join(", ")}`);
  } catch (error) {
    consola.error("Failed to add packages:", error);
    process.exit(1);
  }
}

// ❌ Bad - Mixed concerns, verbose
export async function addCommand({ args, rawArgs }) {
  // Multiple validation checks scattered
  if (rawArgs.length === 0) {
    consola.error("Please specify at least one package name");
    consola.info("Example: basis add lodash");
    process.exit(1);
  }

  const packages = rawArgs.filter((arg) => !arg.startsWith("-"));
  if (packages.length === 0) {
    consola.error("Please specify at least one package name"); // Duplicate
    process.exit(1);
  }

  // Verbose success message
  if (args.dev) {
    await addDevDependency(packages);
    consola.success(`Added ${packages.join(", ")} as dev dependencies`);
  } else {
    await addDependency(packages);
    consola.success(`Added ${packages.join(", ")} as dependencies`);
  }
}
```

## Anti-Patterns

### Verbose Logging

```typescript
// ❌ Bad - Too many intermediate steps
consola.start("Validating input...");
consola.success("Input validated!");
consola.start("Processing files...");
consola.success("Files processed!");
consola.start("Building output...");
consola.success("Build complete!");

// ✅ Good - Only show important results
consola.start("Building project...");
// ... processing ...
consola.success("Build complete!");
```

### Duplicate Validation Logic

```typescript
// ❌ Bad - Repeated checks
if (rawArgs.length === 0) {
  consola.error("Please specify a package name");
  process.exit(1);
}
const packages = rawArgs.filter((arg) => !arg.startsWith("-"));
if (packages.length === 0) {
  consola.error("Please specify a package name"); // Duplicate
  process.exit(1);
}

// ✅ Good - Single validation
const packages = rawArgs.filter((arg) => !arg.startsWith("-"));
if (packages.length === 0) {
  consola.error("Package name required");
  process.exit(1);
}
```

### Over-Engineering Simple Operations

```typescript
// ❌ Bad - Unnecessary abstraction for simple operation
class PackageManager {
  private packages: string[] = [];
  private config: PackageManagerConfig = defaultConfig;

  public addPackages(packages: string[]): Promise<void> {
    // ... complex implementation
  }

  public removePackages(packages: string[]): Promise<void> {
    // ... complex implementation
  }

  public validatePackageName(name: string): boolean {
    // ... over-engineered validation
  }
}

// ✅ Good - Direct and simple
export async function addCommand({ rawArgs }) {
  const packages = rawArgs.filter((arg) => !arg.startsWith("-"));
  if (packages.length === 0) {
    consola.error("Package name required");
    process.exit(1);
  }

  try {
    await addDependency(packages);
    consola.success(`Added ${packages.join(", ")}`);
  } catch (error) {
    consola.error("Failed to add packages:", error);
    process.exit(1);
  }
}
```

### Inconsistent Error Handling

```typescript
// ❌ Bad - Different error patterns
if (!packages.length) {
  throw new Error("No packages provided");
}
if (!configFile) {
  consola.error("Config file not found");
  process.exit(1);
}
if (!hasPermission) {
  return { error: "Permission denied" };
}

// ✅ Good - Consistent error handling
if (!packages.length) {
  consola.error("Package name required");
  process.exit(1);
}
if (!configFile) {
  consola.error("Config file not found");
  process.exit(1);
}
if (!hasPermission) {
  consola.error("Permission denied");
  process.exit(1);
}
```

### Summary of Key Anti-Patterns

- ❌ Unnecessary abstractions for simple operations
- ❌ Verbose logging with intermediate steps
- ❌ Duplicate validation or processing logic
- ❌ Feature creep outside core purpose
- ❌ Inconsistent patterns across modules
- ❌ Over-engineered solutions for simple problems
- ❌ Mixed error handling approaches
