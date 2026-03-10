# Test Coverage Analysis — Archon

> Generated: 2026-03-10

## Current State

- **Test framework:** Vitest v1.0.0 (no coverage tooling configured)
- **Test suites:** 4 files, 104 test cases total
- **Passing:** 1 suite (28 tests) — reviewer agent
- **Failing:** 3 suites — `core/index.test.ts`, `memory/index.test.ts`, `memory/types.test.ts` (missing `zod` in `node_modules`)

## Critical: Broken Test Suite

75% of test suites fail because `zod` is not installed in `node_modules`. The package is declared in `package.json` but needs `npm install` to be run. This likely affects CI as well.

## Coverage Gaps by Module

### Memory System — `src/memory/index.ts` (High Priority)

| Gap | Location | Impact |
|-----|----------|--------|
| `search()` with `since`/`until` date filtering | Lines 238-243 | Date range in search is a separate code path from `list()` |
| `ensureLoaded()` error handling for non-ENOENT errors | Lines 182-186 | Corrupt JSON file behavior is untested |
| `ensureLoaded()` with malformed JSON data | Line 173 | `JSON.parse` can throw — no test covers this |
| `generateId()` uniqueness under rapid saves | Lines 198-200 | ID collision risk untested |
| `search()` with tags AND date range combined | Lines 230-243 | No test combines all filter options |
| MCP provider — `search()`, `get()`, `list()`, `delete()` | Lines 313-353 | Only `save()` error is tested; other methods untested |

### Reviewer Agent — `src/agents/reviewer/index.ts` (Medium Priority)

| Gap | Location | Impact |
|-----|----------|--------|
| `formatFeedbackItem()` with all fields combined | Lines 164-177 | `line` + `explanation` + `suggestedFix` together untested |
| `minSeverity` config behavior | Line 33 | Config is accepted but never used — feature incomplete or test missing |
| Immutability of returned agent object | Lines 70-83 | `readonly` types don't enforce runtime immutability |

### Core Types — `src/core/types.ts` (Low Priority)

| Gap | Impact |
|-----|--------|
| `Agent`, `AgentCapabilities`, `AgentContext` lack Zod schemas | No runtime validation for these types |
| Only `safeParse()` tested, not `parse()` error shapes | ZodError structure untested |

### Memory Types — `src/memory/types.ts` (Low Priority)

| Gap | Impact |
|-----|--------|
| `MemoryInput` has no Zod schema | Boundary type for `save()` lacks runtime validation |
| `MemorySearchOptions` has no schema | Invalid limits/dates pass through silently |

## Structural Recommendations

### 1. Add coverage tooling (High Priority)

No coverage configuration exists. Recommended setup:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
      },
    },
  },
});
```

Add `"test:coverage": "vitest run --coverage"` to `package.json` scripts.

### 2. Fix broken dependency (Critical)

Run `npm install` so `zod` is available and all 4 test suites execute.

### 3. Add integration tests for memory file provider (High Priority)

Missing scenarios:
- Concurrent access (two provider instances writing simultaneously)
- Large datasets (performance with 1000+ entries)
- File permission errors (read-only directory)

### 4. Add boundary validation schemas (Medium Priority)

`MemoryInput` and `MemorySearchOptions` lack Zod schemas. Per project philosophy: "Zod for runtime validation at boundaries."

### 5. Test or implement `minSeverity` config (Medium Priority)

`ReviewerConfig.minSeverity` is stored but never acted upon. Either implement filtering or mark with `.todo()`.

## File-to-Test Coverage Map

| Source File | Test File | Status |
|-------------|-----------|--------|
| `src/agents/reviewer/index.ts` | `src/agents/reviewer/index.test.ts` | ✅ 28 tests passing |
| `src/core/types.ts` | `src/core/index.test.ts` | ❌ 26 tests (blocked by missing zod) |
| `src/memory/types.ts` | `src/memory/types.test.ts` | ❌ 25 tests (blocked by missing zod) |
| `src/memory/index.ts` | `src/memory/index.test.ts` | ❌ 24 tests (blocked by missing zod) |
| `src/index.ts` | — | No tests (entry point, low complexity) |
| `src/core/index.ts` | — | No tests (re-exports only) |
