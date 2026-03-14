# Spec-Driven Development Setup Summary

## What Was Added

Archon now supports **specification-driven development** using TypeSpec. This modernizes the platform to align with 2025 industry best practices where formal specifications are the source of truth.

## Changes Made

### 1. TypeSpec Dependencies

**File**: [`package.json`](package.json)

Added:
```json
"@typespec/compiler": "^0.62.0",
"@typespec/http": "^0.62.0",
"@typespec/openapi3": "^0.62.0",
"@typespec/rest": "^0.62.0"
```

New scripts:
```json
"spec:validate": "tsp compile specs",
"spec:generate": "tsp compile specs --emit @typespec/openapi3",
"spec:watch": "tsp compile specs --watch",
"verify": "npm run spec:validate && npm run typecheck && npm run test:run",
"verify:prd": "npm run typecheck && npm run test:run"
```

### 2. Specification Infrastructure

**Created**:
- `specs/` - TypeSpec specifications directory
  - `specs/main.tsp` - Example API specification (Archon API)
  - `specs/tspconfig.yaml` - TypeSpec compiler configuration
  - `specs/models/` - Shared data models (ready for use)
  - `specs/generated/` - Auto-generated OpenAPI (gitignored)

### 3. Ralph Loop Integration

**File**: [`plans/spec.json`](plans/spec.json)

New format for spec-driven projects:
```json
{
  "mode": "spec-driven",
  "specFile": "specs/main.tsp",
  "verifyCommand": "npm run verify",
  "features": [
    {
      "id": "SPEC-001",
      "title": "TypeSpec infrastructure setup",
      "acceptanceCriteria": [...],
      "priority": 1,
      "passes": false
    }
  ]
}
```

**Existing**: `plans/prd.json` (kept for backward compatibility)

### 4. Documentation

**Created**:
- [`docs/SPEC_DRIVEN_DEVELOPMENT.md`](docs/SPEC_DRIVEN_DEVELOPMENT.md) - Complete guide to spec-driven development in Archon
- Covers:
  - Why spec-driven development
  - Quick start guide
  - TypeSpec basics
  - Ralph Loop integration
  - Workflow comparison
  - Best practices
  - Migration guide
  - Troubleshooting

### 5. Gitignore Updates

**File**: [`.gitignore`](.gitignore)

Added:
```
# TypeSpec generated files
specs/generated/
tsp-output/
```

## How It Works

### Spec-Driven Workflow

1. **Write TypeSpec Specification**
   ```typespec
   model User {
     id: string;
     name: string;
     email: string;
   }

   @route("/users")
   namespace Users {
     @get op listUsers(): User[];
   }
   ```

2. **Validate & Generate**
   ```bash
   npm run spec:validate  # Check TypeSpec syntax
   npm run spec:generate  # Generate OpenAPI
   ```

3. **Generated Outputs**
   - `specs/generated/openapi.yaml` - OpenAPI 3.0 spec
   - TypeScript types (future)
   - API client/server scaffolds (future)

4. **Develop**
   - Types are already defined
   - Contract is guaranteed
   - Breaking changes are explicit

### Ralph Loop Support

**Spec-Driven Mode**:
```bash
# Uses plans/spec.json
./scripts/ralph/ralph.sh --config plans/spec.json
```
- Validates TypeSpec before each iteration
- Regenerates OpenAPI after changes
- Runs full verification: `npm run verify`

**PRD Mode** (Legacy):
```bash
# Uses plans/prd.json
./scripts/ralph/ralph.sh --config plans/prd.json
```
- No spec validation
- Uses `npm run verify:prd`

Both modes work side-by-side for hybrid projects.

## Benefits Over PRD-Driven

| PRD-Driven | Spec-Driven |
|------------|-------------|
| Manual type definitions | Auto-generated from spec |
| Frontend/backend can drift | Guaranteed to match contract |
| Documentation often stale | Always up-to-date (generated) |
| Breaking changes implicit | Breaking changes explicit |
| Tests rely on mocks | Type-safe test generation |
| Runtime errors | Compile-time errors |

## Example: Archon API Spec

See [`specs/main.tsp`](specs/main.tsp) for a complete example that specifies:
- `FeedbackSeverity` enum (blocker, suggestion, nitpick)
- `ReviewResult` model (summary, feedback, positives, etc.)
- `Agent` model (name, role, status, version)
- `/api/v1/review` endpoints (submit, get review)
- `/api/v1/agents` endpoints (list, get agent)

This generates a full OpenAPI 3.0 specification with:
- Type-safe schemas
- Request/response validation
- Auto-generated docs
- Ready for API client generation

## Next Steps

### For Immediate Use

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Try it out**:
   ```bash
   npm run spec:validate
   npm run spec:generate
   cat specs/generated/openapi.yaml
   ```

3. **Explore the example**:
   - Read `specs/main.tsp`
   - Modify it
   - Regenerate: `npm run spec:generate`
   - See how OpenAPI changes

### For Future Development

Planning Agent enhancements (future work):
1. **Spec Generation**: Generate TypeSpec from natural language
2. **Spec Parsing**: Parse existing TypeSpec/OpenAPI
3. **Hybrid Mode**: Detect input type (PRD vs spec)
4. **Code Generation**: Generate TS types/scaffolds from specs

Development Agent enhancements (future work):
1. **Codegen from Specs**: Auto-generate client/server code
2. **Type-Safe Development**: Use generated types
3. **Breaking Change Detection**: Validate against previous specs

## Migration Path

### New Projects
✅ **Use spec-driven from day one**
- Start with `plans/spec.json`
- Write TypeSpec specs
- Let code be generated

### Existing PRD Projects
📋 **Gradual migration**
- Keep using `plans/prd.json` for non-API code
- Add `plans/spec.json` for API surfaces
- Use both modes as needed

### API-Heavy Projects
🚀 **Full migration recommended**
- Convert PRDs to TypeSpec
- Update to `plans/spec.json`
- Use `npm run verify` (includes spec validation)

## Comparison to Industry Tools

| Tool | Language | Focus | Archon Support |
|------|----------|-------|----------------|
| **TypeSpec** | TypeScript-like | API design | ✅ Primary |
| **Smithy** | Custom IDL | Protocol-agnostic | 📋 Future |
| **OpenAPI** | YAML/JSON | HTTP APIs | ✅ Generated |
| **Protobuf** | .proto | gRPC/binary | 📋 Future |

TypeSpec chosen because:
- TypeScript-familiar syntax
- Best tooling in 2025
- Generates OpenAPI (universal)
- Microsoft-backed, strong ecosystem

## Resources

- **TypeSpec Docs**: https://typespec.io/docs
- **Archon Spec Guide**: [`docs/SPEC_DRIVEN_DEVELOPMENT.md`](docs/SPEC_DRIVEN_DEVELOPMENT.md)
- **Example Spec**: [`specs/main.tsp`](specs/main.tsp)
- **OpenAPI Spec**: https://spec.openapis.org/oas/v3.1.0

---

**The future is spec-first.** Write the contract, generate everything else.

Archon is now ready for modern, type-safe, specification-driven development! 🚀
