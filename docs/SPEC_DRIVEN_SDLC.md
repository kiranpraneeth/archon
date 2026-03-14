# Spec-Driven SDLC Workflow

This document describes how to use Archon's spec-driven development approach within the complete Software Development Lifecycle (SDLC).

## Overview

The spec-driven SDLC replaces manual processes with automated, type-safe workflows:

```
┌──────────────────────────────────────────────────────────────────┐
│                    SPEC-DRIVEN SDLC CYCLE                        │
└──────────────────────────────────────────────────────────────────┘

1. SPECIFICATION PHASE
   ┌──────────────┐
   │ TypeSpec     │ → Write API contracts in TypeSpec
   │ Definition   │ → Validate with `npm run spec:validate`
   └──────────────┘ → Generate OpenAPI spec
          ↓

2. PLANNING PHASE
   ┌──────────────┐
   │ Planning     │ → Parse TypeSpec or generate from requirements
   │ Agent        │ → Create technical tasks from spec
   └──────────────┘ → Output: Technical spec with API alignment
          ↓

3. CODE GENERATION PHASE
   ┌──────────────┐
   │ Development  │ → Generate types from TypeSpec
   │ Agent        │ → Generate API client/server scaffolds
   └──────────────┘ → Output: Type-safe code ready for implementation
          ↓

4. IMPLEMENTATION PHASE
   ┌──────────────┐
   │ Development  │ → Write business logic (types already defined)
   │ Agent        │ → Code always matches contract
   └──────────────┘ → Output: Complete implementation
          ↓

5. TESTING PHASE
   ┌──────────────┐
   │ Tester       │ → Generate tests from spec
   │ Agent        │ → Validate against OpenAPI
   └──────────────┘ → Output: Comprehensive test suite
          ↓

6. REVIEW PHASE
   ┌──────────────┐
   │ Reviewer     │ → Check spec compliance
   │ Agent        │ → Verify type safety
   └──────────────┘ → Output: Spec-aware code review
          ↓

7. DEPLOYMENT PHASE
   ┌──────────────┐
   │ Deployer     │ → Validate spec matches implementation
   │ Agent        │ → Publish OpenAPI documentation
   └──────────────┘ → Output: Deployed with API docs
          ↓

8. MONITORING PHASE
   ┌──────────────┐
   │ Monitor      │ → Track API usage metrics
   │ Agent        │ → Detect contract violations
   └──────────────┘ → Feeds back to Specification
```

## Key Differences from PRD-Driven SDLC

| Aspect | PRD-Driven | Spec-Driven |
|--------|-----------|-------------|
| **Source of truth** | Markdown PRD | TypeSpec specification |
| **Type safety** | Runtime validation | Compile-time validation |
| **API documentation** | Manual, often outdated | Auto-generated, always current |
| **Frontend/Backend sync** | Manual coordination | Contract-enforced alignment |
| **Breaking changes** | Discovered late | Caught at spec compilation |
| **Code generation** | Templates only | Types, clients, servers |

## Workflow Example: Spec → Code → Test

### Step 1: Define the Specification

```typespec
// specs/features/users.tsp
import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

/**
 * User management API
 */
@route("/api/v1/users")
namespace Users {

  model User {
    id: string;
    name: string;
    email: string;
    createdAt: utcDateTime;
  }

  model CreateUserRequest {
    name: string;
    email: string;
  }

  @get
  op listUsers(): User[];

  @post
  op createUser(@body request: CreateUserRequest): User;

  @get
  @route("/{id}")
  op getUser(@path id: string): User | NotFound;
}
```

### Step 2: Validate and Generate

```bash
# Validate TypeSpec
npm run spec:validate

# Generate OpenAPI
npm run spec:generate
```

### Step 3: Generate Code

```bash
# Use Development Agent for code generation
/develop --from-spec specs/features/users.tsp

# Or programmatically:
import { generateCodeFromSpec } from './src/agents/developer/codegen';
import { parseSpec } from './src/agents/planner/spec-parser';

const spec = await parseSpec(specContent);
const code = generateCodeFromSpec(spec, {
  generateTypes: true,
  generateClient: true,
  generateServer: true,
  serverFramework: 'hono'
});
```

### Step 4: Implement Business Logic

```typescript
// Generated scaffold includes type-safe handlers
// You only need to implement the business logic

import { User, CreateUserRequest } from './generated/types';
import { UsersRouter } from './generated/server';

const router = new UsersRouter({
  listUsers: async () => {
    // Your implementation - types are already defined
    return await db.users.findAll();
  },

  createUser: async (request: CreateUserRequest) => {
    // Type-safe request handling
    return await db.users.create(request);
  },

  getUser: async (id: string) => {
    const user = await db.users.findById(id);
    if (!user) return { status: 404 };
    return user;
  }
});
```

### Step 5: Generate Tests

```bash
# Tester Agent generates tests based on spec
/test-gen --from-spec specs/features/users.tsp
```

Generated tests automatically cover:
- All endpoints defined in spec
- Request/response validation
- Error cases (404, 400, etc.)
- Edge cases from type definitions

### Step 6: Review with Spec Compliance

```bash
# Reviewer checks against spec
/review --spec-aware
```

The reviewer validates:
- Implementation matches spec contract
- All spec endpoints are implemented
- Response types match definitions
- Error handling follows spec

### Step 7: Deploy with API Documentation

The deployment automatically:
- Publishes OpenAPI spec
- Updates API documentation portal
- Validates production matches spec

## Running Spec-Driven SDLC

### Using SDLC Orchestrator

```bash
# Run full SDLC with spec-driven mode
/sdlc-run --spec specs/main.tsp

# Start from a specific phase
/sdlc-run --spec specs/main.tsp --from development

# Skip phases (e.g., deployment)
/sdlc-run --spec specs/main.tsp --skip deployment
```

### Using Ralph Loop

```bash
# Configure for spec-driven mode
./scripts/ralph/ralph.sh --spec-mode

# Ralph Loop automatically:
# 1. Validates spec before each iteration
# 2. Regenerates OpenAPI on changes
# 3. Runs full verification
```

### Verification Command

The spec-driven verification includes additional checks:

```bash
# Full verification (spec + types + tests)
npm run verify

# Components:
# 1. npm run spec:validate - TypeSpec compilation
# 2. npm run typecheck - TypeScript strict mode
# 3. npm run test:run - All tests pass
```

## Agents in Spec-Driven Mode

### Planning Agent

**Input**: Natural language requirements OR existing TypeSpec

**Output**: TypeSpec specification

**Hybrid Detection**: Auto-detects whether input is:
- PRD/requirements → Generates TypeSpec
- Existing TypeSpec → Parses and analyzes
- OpenAPI → Converts to TypeSpec

```bash
# From requirements
/plan "Create a user management API with CRUD operations"

# From existing spec
/plan --analyze specs/main.tsp
```

### Development Agent

**Input**: TypeSpec specification

**Output**:
- TypeScript types (interfaces, enums)
- Zod validation schemas
- API client class
- Server scaffolds (Hono, Express, Fastify)

```bash
# Generate all code artifacts
/develop --from-spec specs/main.tsp

# Generate specific artifact
/develop --from-spec specs/main.tsp --types-only
/develop --from-spec specs/main.tsp --client-only
```

### Review Agent

**Mode**: Spec-aware code review

**Checks**:
- Implementation matches contract
- All spec operations implemented
- Type compatibility
- Breaking change detection

### Tester Agent

**Mode**: Spec-driven test generation

**Generates**:
- Contract tests (request/response shapes)
- Endpoint tests (all operations)
- Error case tests (4xx, 5xx responses)
- Integration tests (API flows)

## Best Practices

### 1. Spec First, Always

```bash
# ✅ Correct workflow
1. Write/update TypeSpec
2. npm run spec:validate
3. npm run spec:generate
4. Generate code artifacts
5. Implement business logic

# ❌ Incorrect workflow
1. Write code
2. Update spec to match
# Spec becomes documentation, not contract
```

### 2. Validate Before Commit

Add to your pre-commit hook:
```bash
npm run spec:validate
```

Or use the quality hook:
```json
{
  "hooks": [{
    "matcher": "specs/**/*.tsp",
    "command": "npm run spec:validate"
  }]
}
```

### 3. Version Your Specs

```typespec
@service({
  title: "Users API",
  version: "2.0.0"  // Increment on breaking changes
})
```

### 4. Use Shared Models

```typespec
// specs/models/common.tsp
model Pagination {
  page: int32;
  pageSize: int32;
  totalPages: int32;
  totalItems: int64;
}

// specs/features/users.tsp
import "../models/common.tsp";

op listUsers(@query page?: int32): {
  data: User[];
  pagination: Pagination;
};
```

### 5. Document with Intent

```typespec
/**
 * Create a new user account.
 *
 * @param request User creation details
 * @returns Created user with generated ID
 * @throws 400 Invalid email format
 * @throws 409 Email already exists
 */
@post
op createUser(@body request: CreateUserRequest): User;
```

## Troubleshooting

### Spec Validation Fails

```bash
npm run spec:validate
# Error: Unknown decorator @foo

# Fix: Check imports and decorator names
import "@typespec/http";
using TypeSpec.Http;
```

### Generated Code Doesn't Match

```bash
# 1. Ensure spec is saved
# 2. Regenerate
npm run spec:generate

# 3. Check generated files
cat specs/generated/openapi.yaml
```

### Type Mismatch Between Client and Server

```bash
# Both should use generated types
import { User } from './generated/types';

# Not custom types that might drift
interface User { ... }  // ❌ Don't do this
```

## Related Documentation

- [TypeSpec Guide](./TYPESPEC_GUIDE.md) - How to write TypeSpec
- [Spec-Driven Development](./SPEC_DRIVEN_DEVELOPMENT.md) - Concepts and setup
- [SDLC Workflow](./SDLC_WORKFLOW.md) - General SDLC orchestration
- [Agents Guide](./AGENTS.md) - All agent capabilities
