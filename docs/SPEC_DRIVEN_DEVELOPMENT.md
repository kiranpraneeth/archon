# Spec-Driven Development in Archon

## Overview

Archon now supports **specification-driven development** using TypeSpec, enabling you to define APIs with formal, type-safe specifications that generate code, tests, and documentation automatically.

## Why Spec-Driven Development?

Traditional PRD-driven development:
```
PRD → Technical Spec → Code → Tests → Docs
      (manual)        (manual) (manual) (manual)
```

Spec-driven development:
```
TypeSpec Spec → Code + Types + Tests + Docs + OpenAPI
              (generated automatically)
```

### Benefits

1. **Type Safety**: Catch errors at compile time, not runtime
2. **Single Source of Truth**: Specification is the contract
3. **Auto-Generation**: Types, clients, servers generated from specs
4. **Better Collaboration**: Frontend/backend align on contract first
5. **Breaking Change Detection**: Spec changes are explicit
6. **Documentation Always Up-to-Date**: Generated from spec

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs TypeSpec compiler and tooling:
- `@typespec/compiler` - Core TypeSpec compiler
- `@typespec/http` - HTTP/REST annotations
- `@typespec/openapi3` - OpenAPI 3.0 generation
- `@typespec/rest` - RESTful API patterns

### 2. Write a TypeSpec Specification

Create or edit `specs/main.tsp`:

```typespec
import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "My API",
  version: "1.0.0",
})
namespace MyAPI;

model User {
  id: string;
  name: string;
  email: string;
}

@route("/users")
namespace Users {
  @get
  op listUsers(): User[];

  @post
  op createUser(@body user: User): User;
}
```

### 3. Validate and Generate

```bash
# Validate TypeSpec
npm run spec:validate

# Generate OpenAPI
npm run spec:generate

# Watch mode (auto-regenerate on changes)
npm run spec:watch
```

### 4. Use in Development

Generated files appear in `specs/generated/`:
- `openapi.yaml` - OpenAPI 3.0 specification
- TypeScript types (coming soon)
- API clients (coming soon)

## TypeSpec Basics

### Models (Data Structures)

```typespec
model Agent {
  name: string;
  role: string;
  status: "active" | "planned" | "deprecated";
  version: string;
}
```

### Enums

```typespec
enum FeedbackSeverity {
  blocker,
  suggestion,
  nitpick,
}
```

### Operations (API Endpoints)

```typespec
@route("/api/v1/review")
namespace Review {
  @post
  @route("/submit")
  op submitReview(
    @body request: ReviewRequest
  ): ReviewResult;
}
```

### Documentation

```typespec
/**
 * Complete code review result
 */
model ReviewResult {
  /** Overall verdict */
  summary: ReviewSummary;

  /** 2-3 sentence summary */
  overview: string;
}
```

## Ralph Loop Integration

Ralph Loop automatically detects and supports spec-driven development.

### Auto-Detection

When you run Ralph Loop, it checks:
1. Does `plans/spec.json` exist with `"mode": "spec-driven"`? → Spec mode
2. Otherwise, use `plans/prd.json` → PRD mode

### Spec-Driven Mode

Create `plans/spec.json`:

```json
{
  "repo": "owner/repo",
  "mode": "spec-driven",
  "specFile": "specs/main.tsp",
  "branchName": "feature/my-feature",
  "verifyCommand": "npm run verify",
  "features": [
    {
      "id": "API-001",
      "title": "Define User model",
      "acceptanceCriteria": ["..."],
      "priority": 1,
      "passes": false
    }
  ]
}
```

Run Ralph Loop:
```bash
# Auto-detect mode (uses spec.json if present)
./scripts/ralph/ralph.sh

# Explicitly use spec mode
./scripts/ralph/ralph.sh --spec-mode

# With monitoring
./scripts/ralph/ralph.sh --spec-mode --verbose --monitor
```

In spec-driven mode, Ralph Loop:
1. Automatically prepends `npm run spec:validate` to verification
2. Validates TypeSpec specifications before each iteration
3. Tracks spec-related tasks from spec.json

### PRD Mode (Legacy)

For non-API projects, use `plans/prd.json`:

```json
{
  "verifyCommand": "npm run verify",
  "features": [...]
}
```

Run in PRD mode:
```bash
./scripts/ralph/ralph.sh --prd-mode
```

### Both Modes Together

You can have both files:
```
plans/
├── spec.json   # Spec-driven tasks (API work)
└── prd.json    # PRD-driven tasks (other work)
```

Switch between them:
```bash
./scripts/ralph/ralph.sh --spec-mode  # API work
./scripts/ralph/ralph.sh --prd-mode   # Other work
```

See [SPEC_JSON_FORMAT.md](./SPEC_JSON_FORMAT.md) for complete format documentation.

## Workflow Comparison

### Traditional (PRD-Driven)

1. Write PRD in markdown
2. Planning Agent creates tech spec
3. Developer writes code manually
4. Write tests manually
5. Document API manually
6. Hope frontend and backend stay in sync

### Modern (Spec-Driven)

1. Write TypeSpec specification
2. Validate spec with `npm run spec:validate`
3. Generate OpenAPI with `npm run spec:generate`
4. Development Agent generates types/scaffolds
5. Write business logic (types are already defined)
6. Tests and docs auto-generated from spec
7. Frontend and backend guaranteed to match contract

## Available NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run spec:validate` | Validate TypeSpec files |
| `npm run spec:generate` | Generate OpenAPI from TypeSpec |
| `npm run spec:watch` | Auto-regenerate on changes |
| `npm run verify` | Full verification (spec + types + tests) |
| `npm run verify:prd` | Legacy verification (types + tests only) |

## Agent Support

### Planning Agent
- **Input**: Natural language requirements OR existing TypeSpec
- **Output**: TypeSpec specification
- **Mode**: Auto-detects input type (PRD vs spec)

### Development Agent
- **Input**: TypeSpec specification
- **Output**: TypeScript types, API scaffolds
- **Supports**: Code generation from specs

### Review Agent
- **Works with**: Both spec-driven and PRD-driven code
- **Checks**: Spec compliance, type safety

## File Structure

```
archon/
├── specs/                        # TypeSpec specifications
│   ├── main.tsp                  # Main API spec
│   ├── models/                   # Shared models
│   ├── tspconfig.yaml            # TypeSpec config
│   └── generated/                # Generated OpenAPI/code (gitignored)
│       └── openapi.yaml
├── plans/
│   ├── spec.json                 # Spec-driven task tracking
│   └── prd.json                  # PRD-driven task tracking (legacy)
├── src/
│   ├── agents/
│   │   ├── planner/
│   │   │   ├── spec-parser.ts    # Parse TypeSpec/OpenAPI
│   │   │   ├── spec-generator.ts # Generate TypeSpec
│   │   │   └── prd-parser.ts     # Legacy PRD support
│   │   └── developer/
│   │       └── codegen.ts        # Generate code from specs
```

## Best Practices

### 1. Spec First, Code Second

Always write the TypeSpec specification before implementing:
```bash
# ✅ Good workflow
npm run spec:validate
npm run spec:generate
# Now implement based on types

# ❌ Bad workflow
# Write code first, spec later
```

### 2. Version Your Specs

Use semantic versioning for breaking changes:
```typespec
@service({
  title: "My API",
  version: "2.0.0",  // Breaking change
})
```

### 3. Use Models for Reusability

```typespec
// ✅ Good: Reusable models
model User {
  id: string;
  name: string;
}

model CreateUserRequest {
  ...User;  // Spread operator
}

// ❌ Bad: Inline everything
op createUser(@body request: { id: string, name: string }): void;
```

### 4. Document Intent, Not Implementation

```typespec
/**
 * Submit code for automated review.
 * Returns feedback within 30 seconds for files under 500 lines.
 */
op submitReview(...): ReviewResult;
```

### 5. Use Enums for Fixed Values

```typespec
// ✅ Good: Type-safe enums
enum Status {
  active,
  planned,
  deprecated,
}

// ❌ Bad: Stringly-typed
model Agent {
  status: string;  // Could be anything!
}
```

## Migration Guide

### From PRD to Spec-Driven

1. **Identify API surfaces** in your PRD
2. **Extract models** into TypeSpec
3. **Define operations** for each endpoint
4. **Validate** with `npm run spec:validate`
5. **Generate** OpenAPI with `npm run spec:generate`
6. **Update plans** from `prd.json` to `spec.json`

### Gradual Migration

You can use both approaches:
- **Spec-driven** for APIs and data models
- **PRD-driven** for CLI tools, internal utilities

## Troubleshooting

### "tsp: command not found"

Install TypeSpec globally:
```bash
npm install -g @typespec/compiler
```

Or use via npx:
```bash
npx tsp compile specs
```

### TypeSpec Validation Errors

Check:
1. All imports are correct (`@typespec/http`, etc.)
2. Models are properly defined
3. Operations have return types
4. Routes don't conflict

### Generated OpenAPI is Wrong

1. Check `specs/tspconfig.yaml` configuration
2. Ensure `@typespec/openapi3` is installed
3. Run `npm run spec:generate` again
4. Check `specs/generated/openapi.yaml`

## Resources

- [TypeSpec Documentation](https://typespec.io/docs)
- [TypeSpec Playground](https://typespec.io/playground)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [Archon Examples](../specs/main.tsp)

## Next Steps

1. Explore the example spec in `specs/main.tsp`
2. Try generating OpenAPI: `npm run spec:generate`
3. Create your own API spec
4. Use Planning Agent to generate specs from requirements
5. Run Ralph Loop in spec-driven mode

---

**Spec-driven development is the future.** Write once (the spec), generate everything else.
