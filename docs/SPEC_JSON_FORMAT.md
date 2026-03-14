# spec.json Format Documentation

## Overview

`spec.json` is the task tracking file for **spec-driven development** with Ralph Loop. It's an alternative to `prd.json` (PRD-driven development) designed specifically for API-first, specification-based workflows.

## File Location

```
plans/
├── spec.json        # Spec-driven mode (preferred for API projects)
└── prd.json         # PRD-driven mode (legacy, for non-API projects)
```

## Format

```json
{
  "repo": "owner/repo-name",
  "mode": "spec-driven",
  "specFile": "specs/main.tsp",
  "branchName": "feature/my-feature",
  "verifyCommand": "npm run verify",
  "acceptanceCriteria": [
    "Overall project acceptance criteria..."
  ],
  "features": [
    {
      "id": "SPEC-001",
      "title": "Task title",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "priority": 1,
      "passes": false,
      "notes": "Optional notes"
    }
  ]
}
```

## Fields

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo` | string | No | GitHub repository in `owner/repo` format |
| `mode` | string | **Yes** | Must be `"spec-driven"` for spec mode |
| `specFile` | string | **Yes** | Path to the main TypeSpec file |
| `branchName` | string | No | Git branch for this work |
| `verifyCommand` | string | No | Verification command (default: project's verify script) |
| `acceptanceCriteria` | string[] | No | Overall project acceptance criteria |
| `features` | object[] | **Yes** | Array of task/feature objects |

### Feature Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Unique identifier (e.g., `SPEC-001`) |
| `title` | string | **Yes** | Short task description |
| `acceptanceCriteria` | string[] | **Yes** | List of criteria for task completion |
| `priority` | number | No | Priority (1=highest, 3=lowest). Default: 2 |
| `passes` | boolean | **Yes** | Whether task is complete. Set to `false` initially |
| `completed_at` | string | No | ISO timestamp when task was completed |
| `skip` | boolean | No | Skip this task (for manual tasks) |
| `skipReason` | string | No | Why task is skipped |
| `github_issue` | number | No | Associated GitHub issue number |
| `notes` | string | No | Additional notes |

## Auto-Detection

Ralph Loop auto-detects which mode to use:

1. If `plans/spec.json` exists with `"mode": "spec-driven"` → Spec-driven mode
2. Otherwise, if `plans/prd.json` exists → PRD-driven mode
3. If neither exists → Error

### Force a Specific Mode

```bash
# Force spec-driven mode
./scripts/ralph/ralph.sh --spec-mode

# Force PRD-driven mode
./scripts/ralph/ralph.sh --prd-mode

# Use a specific task file
./scripts/ralph/ralph.sh --task-file path/to/tasks.json
```

## Verification Behavior

### Spec-Driven Mode

When in spec-driven mode, Ralph Loop automatically prepends `npm run spec:validate` to the verification command:

```bash
# If verifyCommand is "npm run verify", actual verification becomes:
npm run spec:validate && npm run verify
```

This ensures TypeSpec specifications are validated before other checks.

### PRD-Driven Mode

Verification runs exactly as specified in `verifyCommand`.

## Example: spec.json

```json
{
  "repo": "myorg/my-api",
  "mode": "spec-driven",
  "specFile": "specs/api.tsp",
  "branchName": "feature/user-api",
  "verifyCommand": "npm run verify",
  "acceptanceCriteria": [
    "User API endpoints implemented",
    "TypeSpec validates without errors",
    "All tests pass"
  ],
  "features": [
    {
      "id": "API-001",
      "title": "Define User model in TypeSpec",
      "acceptanceCriteria": [
        "User model defined in specs/api.tsp",
        "npm run spec:validate passes",
        "OpenAPI generated successfully"
      ],
      "priority": 1,
      "passes": false,
      "notes": "Foundation for user endpoints"
    },
    {
      "id": "API-002",
      "title": "Implement user CRUD endpoints",
      "acceptanceCriteria": [
        "GET /users endpoint",
        "POST /users endpoint",
        "TypeScript types generated from spec",
        "Integration tests pass"
      ],
      "priority": 2,
      "passes": false
    }
  ]
}
```

## Example: Running Ralph Loop

### Starting a Spec-Driven Loop

```bash
# Auto-detect mode (uses spec.json if present)
./scripts/ralph/ralph.sh

# Explicitly use spec mode
./scripts/ralph/ralph.sh --spec-mode

# With monitoring
./scripts/ralph/ralph.sh --monitor --verbose
```

### Checking Status

```bash
# View status
./scripts/ralph/ralph-status.sh

# Watch in real-time
./scripts/ralph/ralph-status.sh --watch

# Tail logs
./scripts/ralph/ralph-tail.sh
```

## Comparison: spec.json vs prd.json

| Aspect | spec.json (Spec-Driven) | prd.json (PRD-Driven) |
|--------|------------------------|----------------------|
| **Mode** | `"spec-driven"` | `"prd-driven"` or none |
| **TypeSpec** | Required | Optional |
| **Verification** | Includes spec validation | Direct command |
| **Use case** | API-first development | Traditional requirements |
| **specFile** | Required | Not used |

## Migration from prd.json

To migrate from PRD-driven to spec-driven:

1. Create `plans/spec.json`
2. Set `"mode": "spec-driven"`
3. Add `"specFile": "specs/main.tsp"`
4. Copy `features` array from `prd.json`
5. Optionally keep `prd.json` for non-API tasks

```bash
# Both files can coexist - spec.json takes priority
plans/
├── spec.json   # Used by default (spec-driven)
└── prd.json    # Available via --prd-mode
```

## Best Practices

1. **One mode per project branch**: Don't mix spec-driven and PRD-driven tasks in the same file
2. **Granular tasks**: Break features into small, testable units
3. **Clear acceptance criteria**: Each criterion should be verifiable
4. **Use priority**: Higher priority tasks (1) are picked first
5. **Skip manual tasks**: Use `skip: true` for tasks requiring human intervention
6. **Reference issues**: Add `github_issue` for traceability

## Related Documentation

- [Spec-Driven Development](./SPEC_DRIVEN_DEVELOPMENT.md) - Full guide to spec-driven workflows
- [TypeSpec Guide](./TYPESPEC_GUIDE.md) - How to write TypeSpec specifications
- [Spec-Driven SDLC](./SPEC_DRIVEN_SDLC.md) - Complete SDLC integration
