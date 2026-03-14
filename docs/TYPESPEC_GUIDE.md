# TypeSpec Guide for Archon

A comprehensive guide to writing API specifications using TypeSpec in the Archon platform.

## Table of Contents

- [What is TypeSpec?](#what-is-typespec)
- [Getting Started](#getting-started)
- [TypeSpec Basics](#typespec-basics)
  - [Models](#models)
  - [Enums](#enums)
  - [Operations](#operations)
  - [Namespaces](#namespaces)
- [HTTP and REST](#http-and-rest)
  - [Routes](#routes)
  - [HTTP Methods](#http-methods)
  - [Path Parameters](#path-parameters)
  - [Query Parameters](#query-parameters)
  - [Request Bodies](#request-bodies)
  - [Response Types](#response-types)
- [Advanced Patterns](#advanced-patterns)
  - [Model Composition](#model-composition)
  - [Optional and Nullable](#optional-and-nullable)
  - [Default Values](#default-values)
  - [Arrays and Maps](#arrays-and-maps)
  - [Union Types](#union-types)
  - [Error Responses](#error-responses)
- [Documentation](#documentation)
- [Examples from Archon](#examples-from-archon)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Validation and Generation](#validation-and-generation)

## What is TypeSpec?

TypeSpec is a language for describing APIs that generates OpenAPI specifications, client SDKs, and server scaffolds. It provides:

- **Type Safety**: Strong typing catches errors at compile time
- **Reusability**: Define models once, use everywhere
- **Clarity**: Clean syntax focused on API design
- **Generation**: Automatically produce OpenAPI, types, clients

## Getting Started

### Prerequisites

TypeSpec is already configured in Archon. The required packages are:

```json
{
  "@typespec/compiler": "^0.65.1",
  "@typespec/http": "^0.65.0",
  "@typespec/openapi3": "^0.65.0",
  "@typespec/rest": "^0.65.0"
}
```

### Your First Spec

Create a file in `specs/` directory (e.g., `specs/my-api.tsp`):

```typespec
import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "My API",
})
namespace MyAPI;

model Greeting {
  message: string;
}

@route("/hello")
op sayHello(): Greeting;
```

### Validate and Generate

```bash
# Validate TypeSpec syntax
npm run spec:validate

# Generate OpenAPI
npm run spec:generate

# Watch mode for development
npm run spec:watch
```

## TypeSpec Basics

### Models

Models define data structures. They are the foundation of your API.

```typespec
model User {
  id: string;
  name: string;
  email: string;
  createdAt: utcDateTime;
}
```

**Built-in scalar types:**

| Type | Description |
|------|-------------|
| `string` | Text data |
| `int32` | 32-bit integer |
| `int64` | 64-bit integer |
| `float32` | 32-bit float |
| `float64` | 64-bit float |
| `boolean` | True/false |
| `bytes` | Binary data |
| `utcDateTime` | Date and time |
| `plainDate` | Date only |
| `plainTime` | Time only |
| `url` | URL string |

### Enums

Enums define a fixed set of values:

```typespec
enum Status {
  active,
  pending,
  completed,
  cancelled,
}

model Task {
  id: string;
  status: Status;
}
```

**Enums with descriptions:**

```typespec
enum FeedbackSeverity {
  /** Must fix before merge */
  blocker,

  /** Should consider */
  suggestion,

  /** Optional improvement */
  nitpick,
}
```

**String enums with custom values:**

```typespec
enum Environment {
  production: "prod",
  staging: "stage",
  development: "dev",
}
```

### Operations

Operations define API endpoints:

```typespec
op getUser(): User;
op createUser(@body user: User): User;
op deleteUser(@path id: string): void;
```

### Namespaces

Namespaces group related models and operations:

```typespec
@service({
  title: "Archon API",
})
namespace Archon;

// Child namespace for review endpoints
@route("/api/v1/review")
namespace Review {
  op submitReview(@body request: ReviewRequest): ReviewResult;
}

// Child namespace for agent endpoints
@route("/api/v1/agents")
namespace Agents {
  op listAgents(): Agent[];
}
```

## HTTP and REST

### Routes

Define routes using the `@route` decorator:

```typespec
@route("/api/v1")
namespace API {
  @route("/users")
  namespace Users {
    // Endpoints live here
  }
}
```

Routes are concatenated: `/api/v1/users`

### HTTP Methods

Use decorators for HTTP methods:

```typespec
@route("/users")
namespace Users {
  @get
  op list(): User[];

  @post
  op create(@body user: User): User;

  @get
  @route("/{id}")
  op get(@path id: string): User;

  @put
  @route("/{id}")
  op update(@path id: string, @body user: User): User;

  @patch
  @route("/{id}")
  op patch(@path id: string, @body updates: Partial<User>): User;

  @delete
  @route("/{id}")
  op delete(@path id: string): void;
}
```

### Path Parameters

Use `@path` for URL parameters:

```typespec
@get
@route("/{userId}/posts/{postId}")
op getPost(
  @path userId: string,
  @path postId: string
): Post;
```

### Query Parameters

Use `@query` for query string parameters:

```typespec
@get
op listUsers(
  @query limit?: int32,
  @query offset?: int32,
  @query sortBy?: string,
  @query order?: "asc" | "desc"
): User[];
```

Generates: `GET /users?limit=10&offset=0&sortBy=name&order=asc`

### Request Bodies

Use `@body` for request bodies:

```typespec
model CreateUserRequest {
  name: string;
  email: string;
  role?: string;
}

@post
op createUser(@body request: CreateUserRequest): User;
```

### Response Types

Operations return response types directly:

```typespec
// Single response
op getUser(@path id: string): User;

// Multiple possible responses
op getUser(@path id: string): User | NotFoundError;

// No content
@delete
op deleteUser(@path id: string): void;
```

## Advanced Patterns

### Model Composition

**Spread operator** - include all fields from another model:

```typespec
model BaseEntity {
  id: string;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model User {
  ...BaseEntity;  // Includes id, createdAt, updatedAt
  name: string;
  email: string;
}
```

**Extends** - inherit from another model:

```typespec
model Animal {
  name: string;
}

model Dog extends Animal {
  breed: string;
}
```

### Optional and Nullable

**Optional fields** (may be omitted):

```typespec
model User {
  name: string;      // Required
  nickname?: string; // Optional (may be missing)
}
```

**Nullable fields** (may be null):

```typespec
model User {
  name: string;
  deletedAt: utcDateTime | null;  // Can be null
}
```

### Default Values

Provide default values for fields:

```typespec
model PaginationRequest {
  limit?: int32 = 20;
  offset?: int32 = 0;
}

model User {
  role?: string = "member";
  isActive?: boolean = true;
}
```

### Arrays and Maps

**Arrays:**

```typespec
model Team {
  name: string;
  members: User[];
  tags: string[];
}
```

**Maps (Records):**

```typespec
model Config {
  settings: Record<string>;  // { [key: string]: string }
}
```

### Union Types

Define types that can be one of several options:

```typespec
// String literal union
model Agent {
  status: "active" | "planned" | "deprecated";
}

// Model union (polymorphism)
model Response {
  data: SuccessResult | ErrorResult;
}

// Named union
union PaymentMethod {
  creditCard: CreditCard,
  bankTransfer: BankTransfer,
  crypto: CryptoWallet,
}
```

### Error Responses

Define error models with `@error`:

```typespec
@error
model NotFoundError {
  code: "NOT_FOUND";
  message: string;
}

@error
model ValidationError {
  code: "VALIDATION_ERROR";
  message: string;
  details: ValidationDetail[];
}

model ValidationDetail {
  field: string;
  issue: string;
}

// Use in operations
@get
@route("/{id}")
op getUser(@path id: string): User | NotFoundError;

@post
op createUser(@body user: User): User | ValidationError;
```

## Documentation

Document your API with JSDoc-style comments:

```typespec
/**
 * Represents a user in the system.
 *
 * Users can have different roles and permissions.
 */
model User {
  /** Unique identifier (UUID) */
  id: string;

  /** User's display name (2-50 characters) */
  name: string;

  /** Email address (must be unique) */
  email: string;

  /** Account creation timestamp */
  createdAt: utcDateTime;
}

/**
 * Retrieve a user by their unique identifier.
 *
 * Returns 404 if the user does not exist.
 */
@get
@route("/{id}")
op getUser(
  /** The user's UUID */
  @path id: string
): User | NotFoundError;
```

## Examples from Archon

The Archon API specification (`specs/main.tsp`) demonstrates real-world patterns:

### Enums for Domain Values

```typespec
/**
 * Severity levels for code review feedback
 */
enum FeedbackSeverity {
  /**
   * Must fix before merge - bugs, security issues
   */
  blocker,

  /**
   * Should consider - code quality, maintainability
   */
  suggestion,

  /**
   * Optional - style preferences, minor improvements
   */
  nitpick,
}
```

### Models with Documentation

```typespec
/**
 * A single piece of feedback from a code review
 */
model FeedbackItem {
  /** Severity level of this feedback */
  severity: FeedbackSeverity;

  /** Relative path to the file */
  file: string;

  /** Line number in the file (optional) */
  line?: int32;

  /** Description of the issue */
  message: string;

  /** Suggested fix or approach (optional) */
  suggestedFix?: string;
}
```

### API Endpoints with Multiple Responses

```typespec
/**
 * Code Review endpoints
 */
@route("/api/v1/review")
namespace Review {
  /**
   * Submit code for review
   */
  @post
  @route("/submit")
  op submitReview(
    @body request: ReviewRequest
  ): ReviewResult | ErrorResponse;

  /**
   * Get review status
   */
  @get
  @route("/{reviewId}")
  op getReview(
    @path reviewId: string
  ): ReviewResult | ErrorResponse;
}
```

### Server Configuration

```typespec
@service({
  title: "Archon API",
})
@server("https://api.archon.dev", "Production server")
@server("http://localhost:3000", "Development server")
namespace Archon;
```

## Best Practices

### 1. Start with Models

Define your data structures before operations:

```typespec
// Define models first
model User { ... }
model CreateUserRequest { ... }
model UpdateUserRequest { ... }

// Then operations
@route("/users")
namespace Users {
  op create(@body request: CreateUserRequest): User;
  op update(@path id: string, @body request: UpdateUserRequest): User;
}
```

### 2. Use Meaningful Names

```typespec
// Good: Clear intent
model ReviewSubmissionRequest { ... }
model ReviewCompletionResult { ... }

// Avoid: Vague names
model Data { ... }
model Response { ... }
```

### 3. Document Intent, Not Implementation

```typespec
/**
 * Submit code for automated review.
 * Returns feedback within 30 seconds for files under 500 lines.
 */
op submitReview(...): ReviewResult;

// Not: "This calls the review service which..."
```

### 4. Use Enums for Fixed Values

```typespec
// Good: Type-safe
enum Priority {
  high,
  medium,
  low,
}

model Task {
  priority: Priority;
}

// Avoid: Stringly-typed
model Task {
  priority: string;  // Could be anything!
}
```

### 5. Group Related Operations

```typespec
// Group by resource
@route("/users")
namespace Users {
  op list(): User[];
  op create(@body user: User): User;
  op get(@path id: string): User;
}

// Not scattered across namespaces
```

### 6. Consistent Error Handling

```typespec
@error
model ApiError {
  code: string;
  message: string;
  details?: string;
}

// Use consistently across all operations
op getUser(@path id: string): User | ApiError;
op createUser(@body user: User): User | ApiError;
```

### 7. Version Your API

```typespec
@service({
  title: "Archon API",
  version: "1.0.0",
})
namespace Archon;

// Routes include version
@route("/api/v1")
namespace V1 { ... }
```

## Common Patterns

### CRUD Operations

```typespec
model Resource {
  id: string;
  name: string;
  createdAt: utcDateTime;
}

model CreateResourceRequest {
  name: string;
}

model UpdateResourceRequest {
  name?: string;
}

@route("/resources")
namespace Resources {
  @get
  op list(
    @query limit?: int32 = 20,
    @query offset?: int32 = 0
  ): Resource[];

  @post
  op create(@body request: CreateResourceRequest): Resource;

  @get
  @route("/{id}")
  op get(@path id: string): Resource | NotFoundError;

  @put
  @route("/{id}")
  op update(
    @path id: string,
    @body request: UpdateResourceRequest
  ): Resource | NotFoundError;

  @delete
  @route("/{id}")
  op delete(@path id: string): void | NotFoundError;
}
```

### Paginated Responses

```typespec
model PaginatedResponse<T> {
  items: T[];
  total: int32;
  limit: int32;
  offset: int32;
  hasMore: boolean;
}

@get
op listUsers(
  @query limit?: int32 = 20,
  @query offset?: int32 = 0
): PaginatedResponse<User>;
```

### Nested Resources

```typespec
@route("/teams/{teamId}/members")
namespace TeamMembers {
  @get
  op list(@path teamId: string): User[];

  @post
  op add(
    @path teamId: string,
    @body request: AddMemberRequest
  ): User;

  @delete
  @route("/{userId}")
  op remove(
    @path teamId: string,
    @path userId: string
  ): void;
}
```

### Async Operations

```typespec
model AsyncJob {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
}

@post
@route("/long-running")
op startJob(@body request: JobRequest): AsyncJob;

@get
@route("/jobs/{jobId}")
op getJobStatus(@path jobId: string): AsyncJob;
```

## Validation and Generation

### Validate Your Specs

Always validate before committing:

```bash
npm run spec:validate
```

Common validation errors:
- Missing imports (`import "@typespec/http"`)
- Undefined model references
- Invalid enum values
- Route conflicts

### Generate OpenAPI

```bash
npm run spec:generate
```

Output appears in `specs/generated/`:
- `@typespec/openapi3/openapi.yaml` - OpenAPI 3.0 spec

### Full Verification

Archon's verification command checks everything:

```bash
npm run verify
```

This runs:
1. `spec:validate` - TypeSpec compilation
2. `typecheck` - TypeScript type checking
3. `test:run` - Unit tests

### Watch Mode

For rapid development:

```bash
npm run spec:watch
```

Re-validates and regenerates on every save.

## Resources

- [TypeSpec Documentation](https://typespec.io/docs)
- [TypeSpec Playground](https://typespec.io/playground) - Try TypeSpec in browser
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [Archon API Spec](../specs/main.tsp) - Real example

---

**Next Steps:**

1. Review `specs/main.tsp` to see these patterns in action
2. Run `npm run spec:validate` to ensure specs compile
3. Use the Planning Agent to generate specs from requirements
4. Use the Development Agent to generate code from specs
