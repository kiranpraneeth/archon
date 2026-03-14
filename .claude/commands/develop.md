# Development Agent

Generate code, detect patterns, or analyze code for refactoring opportunities.

## Usage

```
/develop [mode] [target]
```

## Modes

### generate (default)
Generate implementation code from a specification or description.

```
/develop generate "Add a function that validates email addresses"
/develop generate --spec docs/feature-spec.md
```

### analyze
Analyze code for patterns, complexity, and refactoring opportunities.

```
/develop analyze src/utils.ts
/develop analyze src/agents/
```

### refactor
Suggest and apply refactoring improvements.

```
/develop refactor src/complex-function.ts
/develop refactor --type extract_function src/large-file.ts
```

## Options

- `--spec <file>`: Read specification from file
- `--type <type>`: Specific refactoring type (extract_function, simplify, etc.)
- `--output json`: Output as JSON instead of markdown
- `--dry-run`: Show what would be generated without making changes

## Examples

### Generate a new feature
```
/develop generate "Create a caching layer with TTL support"
```

### Analyze complexity
```
/develop analyze src/core/orchestrator.ts
```

### Find refactoring opportunities
```
/develop refactor src/agents/reviewer/
```

## Notes

- All generated code requires human review before commit
- The agent will match existing codebase patterns
- Test suggestions are included with generated code
