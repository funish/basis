# Contributing to Basis

> Internal development guidelines and best practices for the Basis project

This document outlines the development principles, patterns, and practices that should be followed when contributing to the Basis project. These guidelines were established through practical development experience and help maintain code quality, consistency, and maintainability.

## 🎯 Core Development Principles

### 1. Keep It Simple (KISS)

- **Avoid over-engineering**: Don't build complex solutions for simple problems
- **Prefer straightforward approaches**: Choose clarity over cleverness
- **Question complexity**: If something feels complex, step back and reconsider
- **Example**: Use direct function calls instead of elaborate abstraction layers

### 2. Don't Repeat Yourself (DRY)

- **Extract common logic**: Create reusable functions for repeated patterns
- **Share utilities**: Use shared helper functions across modules
- **Consistent patterns**: Apply the same approach to similar problems
- **Example**: Extract version calculation logic into separate functions

### 3. Balanced Output (Refined Unix Philosophy)

- **Silent Process**: Don't output messages for intermediate steps
- **Clear Completion**: Provide final status for important operations
- **Important Results**: Show critical information users need to know
- **User Control**: Provide `--silent` options where appropriate

```javascript
// ❌ Too verbose (intermediate steps)
consola.start("Setting up Git configuration...");
consola.success("Git configuration completed!");
consola.success("Setting up Git hooks...");
consola.success("Git hooks completed!");

// ✅ Clean process with clear completion
// (Silent intermediate steps)
consola.success("Git setup completed successfully!"); // Final result only

// ✅ Critical results that users need
consola.success(`Version updated: 1.0.0 → 1.1.0`); // Version changes
consola.success(`Published package@1.1.0 to latest`); // Publish results
```

### 4. Consistent Structure

- **Uniform module patterns**: All modules should follow the same structure
- **Predictable interfaces**: Similar functions should have similar signatures
- **Standard error handling**: Use consistent error reporting across modules
- **Naming conventions**: Follow established naming patterns

### 5. User Habit Consistency

- **Familiar CLI patterns**: Follow established CLI conventions
- **Predictable behavior**: Commands should work as users expect
- **Standard flags**: Use common flag names (--force, --dry-run, etc.)
- **Help text**: Provide clear, consistent help messages

## 🛠️ Implementation Guidelines

### Function Design

```typescript
// ✅ Good: Single responsibility, clear intent
export async function calculateNewVersion(
  currentVersion: string,
  increment: VersionIncrement,
): Promise<string> {
  // Implementation
}

// ❌ Bad: Multiple responsibilities
export async function updateVersionAndCommitAndTag(options: ComplexOptions) {
  // Too many responsibilities
}
```

### Error Handling

```typescript
// ✅ Good: Graceful degradation
if (commands.audit) {
  try {
    execSync(commands.audit, { cwd, stdio: "pipe" });
  } catch (error) {
    consola.error("Security vulnerabilities detected:", error);
    hasIssues = true;
  }
} else {
  consola.warn(`Security audit not available for ${packageManager}`);
}

// ❌ Bad: Assumes command exists
execSync(commands.audit, { cwd, stdio: "pipe" });
```

### Output Management

```typescript
// ✅ Good: Silent process with important completion
consola.start("Initializing basis configuration...");
// (Silent intermediate steps)
consola.success("Basis initialization completed!"); // Users need to know

// ✅ Good: Critical results
const result = await updatePackageVersion(cwd, options);
consola.success(`Version updated: ${result.oldVersion} → ${result.newVersion}`);

// ❌ Bad: Verbose intermediate confirmations
consola.start("Creating config file...");
consola.success("Config file created!");
consola.start("Installing dependencies...");
consola.success("Dependencies installed!");
consola.start("Setting up Git...");
consola.success("Git setup completed!");
consola.success("Basis initialization completed!"); // Redundant final message
```

## 📋 Code Quality Standards

### TypeScript Usage

- **Strict typing**: Enable strict TypeScript settings
- **Type safety**: Prefer explicit types over `any`
- **Interface design**: Create clear, focused interfaces
- **Generic constraints**: Use proper generic constraints

### Testing Strategy

- **Test critical paths**: Focus on core functionality
- **Mock external dependencies**: Don't test external libraries
- **Error scenarios**: Test error conditions and edge cases
- **Integration tests**: Test command combinations

### Performance Considerations

- **Parallel operations**: Use parallel tool calls when possible
- **Efficient algorithms**: Choose appropriate data structures
- **Memory usage**: Be mindful of large file operations
- **Async patterns**: Use proper async/await patterns

## 🔧 Module Organization

### Commands vs Modules

- **Commands** (`src/commands/`): CLI interface, argument parsing, user interaction
- **Modules** (`src/modules/`): Business logic, core functionality
- **Utils** (`src/utils.ts`): Shared helper functions
- **Types** (`src/types.ts`): TypeScript definitions

### File Structure

```
src/
├── commands/           # CLI command handlers
│   ├── init.ts        # basis init
│   ├── version.ts     # basis version
│   └── ...
├── modules/           # Core business logic
│   ├── init.ts        # Initialization logic
│   ├── version.ts     # Version management
│   └── ...
├── config.ts          # Configuration system
├── types.ts           # Type definitions
└── utils.ts           # Shared utilities
```

## 🎨 Best Practices

### Configuration

- **Sensible defaults**: Provide good default values
- **Auto-detection**: Detect settings when possible
- **Override support**: Allow users to override defaults
- **Type safety**: Use TypeScript for configuration schemas

### Git Integration

- **Clean repository**: Don't commit temporary files
- **Atomic commits**: Each commit should represent one logical change
- **Conventional commits**: Follow established commit message format
- **Branch management**: Use clear branch names

### Documentation

- **Code comments**: Explain why, not what
- **JSDoc**: Document public APIs
- **README updates**: Keep documentation current
- **Examples**: Provide practical examples

## 🚨 Common Anti-Patterns to Avoid

### Over-abstraction

```typescript
// ❌ Bad: Unnecessary abstraction
class CommandExecutor {
  async execute(command: Command): Promise<Result> {
    // Complex command pattern for simple exec calls
  }
}

// ✅ Good: Direct approach
execSync(command, { cwd, stdio: "inherit" });
```

### Feature Creep

- **Stick to scope**: Don't add features outside of core purpose
- **Resist gold-plating**: Don't over-engineer solutions
- **User-driven**: Add features based on real user needs

### Inconsistent Patterns

- **Same problems, same solutions**: Use established patterns
- **Don't reinvent**: Reuse existing utilities and approaches
- **Team coordination**: Discuss new patterns before implementing

## 📊 Code Review Checklist

- [ ] Follows established patterns
- [ ] No unnecessary complexity
- [ ] Clean, minimal output
- [ ] Proper error handling
- [ ] TypeScript compliance
- [ ] No code duplication
- [ ] Clear function names
- [ ] Appropriate abstractions
- [ ] Consistent with existing code
- [ ] Tests for new functionality

## 🔄 Refactoring Guidelines

When refactoring existing code:

1. **Preserve behavior**: Don't change functionality
2. **Test first**: Ensure existing tests pass
3. **Small steps**: Make incremental improvements
4. **Document changes**: Explain why changes were made
5. **Follow principles**: Apply current guidelines to old code

## 📈 Continuous Improvement

- **Regular reviews**: Periodically review code for improvements
- **Pattern recognition**: Identify and extract common patterns
- **Tool updates**: Stay current with ecosystem changes
- **Feedback integration**: Incorporate user feedback into design decisions

---

Remember: These guidelines evolve based on practical experience. When you encounter situations not covered here, make decisions that align with the overall philosophy of simplicity, consistency, and user experience.
