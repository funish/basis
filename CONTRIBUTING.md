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

```javascript
// ✅ Good
consola.success(`Version updated: ${oldVersion} → ${newVersion}`);

// ❌ Bad
consola.start("Step 1...");
consola.success("Step 1 done!");
consola.start("Step 2...");
consola.success("Step 2 done!");
```

### Consistent Patterns

- Uniform module structure
- Standard error handling
- Familiar CLI conventions

## Code Standards

- **TypeScript**: Use explicit types, avoid `any`
- **Functions**: Single responsibility, clear naming
- **Errors**: Graceful degradation, clear messages
- **Tests**: Focus on critical paths and edge cases

## Anti-Patterns

- ❌ Unnecessary abstractions for simple operations
- ❌ Feature creep outside core purpose
- ❌ Inconsistent patterns across modules
