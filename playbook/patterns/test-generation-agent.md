# Test Generation Agent Pattern

> Generate tests that verify behavior, not implementation

## What It Does

The Test Generation Agent creates comprehensive, maintainable tests. It reads code structure and generates tests that give engineers confidence without coupling to implementation details.

**Core responsibilities:**
- Generate unit tests for functions and classes
- Cover edge cases (empty inputs, boundaries, errors)
- Mock external dependencies appropriately
- Follow project conventions (Vitest, pytest, etc.)

## Test Philosophy

### Behavior Over Implementation
```typescript
// Good: Tests what the function does
it("should return empty array when no items match filter", () => {
  expect(filterItems([], isActive)).toEqual([]);
});

// Bad: Tests how it does it
it("should call Array.filter internally", () => {
  const spy = vi.spyOn(Array.prototype, 'filter');
  filterItems(items, isActive);
  expect(spy).toHaveBeenCalled();
});
```

### Readable Test Names
Pattern: `should [verb] [expected outcome] when [condition]`

```typescript
describe("createReviewAgent", () => {
  describe("when called with no config", () => {
    it("should return agent with default values", () => {});
    it("should have correct capabilities", () => {});
  });

  describe("when called with config overrides", () => {
    it("should merge overrides with defaults", () => {});
  });
});
```

### Edge Cases Always
Every function should have tests for:
- Empty inputs (`null`, `undefined`, `[]`, `""`)
- Boundary conditions (0, -1, max values)
- Error conditions (invalid input, failures)
- Async behavior (rejections, timeouts)

## Command Usage

```bash
/test-gen src/utils/validate.ts    # Generate tests for a file
/test-gen src/agents/reviewer/     # Generate tests for a directory
```

The command:
1. Reads the source file
2. Identifies exported functions/classes
3. Generates test file alongside source (`*.test.ts`)
4. Adds to existing tests if file exists (doesn't overwrite)

## Example Output

For a function like:
```typescript
export function formatReviewAsMarkdown(review: ReviewResult): string
```

Generated tests cover:
- Each summary type (approve, request_changes, needs_discussion)
- Empty feedback array
- Multiple feedback items grouped by severity
- Optional fields present/absent
- Edge case: all sections populated

See `src/agents/reviewer/index.test.ts` for a real example (390 lines covering two functions).

## Mocking Strategy

| Mock | Don't Mock |
|------|------------|
| External APIs | Pure utility functions |
| Database calls | Internal modules without side effects |
| File system | Simple data transformations |
| Time-dependent functions | |

```typescript
// Mock external dependency
vi.mock("./external-api", () => ({
  fetchData: vi.fn().mockResolvedValue({ data: [] }),
}));

// Don't mock internal helper
// Just test through the public interface
```

## The Gap: Manual Invocation

Currently, `/test-gen` requires a human to run it.

**Implemented:**
- PostToolUse hook that warns when source files lack corresponding test files

**Remaining opportunities:**
- CI check: Fail PRs that reduce coverage
- Pre-commit: Block commits without tests for new exports
- Coverage threshold enforcement

## Lesson Learned

**Test the contract, not the implementation.**

When tests are coupled to implementation:
- Refactors break tests even when behavior is unchanged
- Tests become maintenance burden
- Engineers avoid refactoring to avoid fixing tests

When tests verify behavior:
- Refactors are safe if tests pass
- Tests serve as documentation
- Confidence to change code

**The pattern:** Ask "what should this function do?" not "how does this function work?"

## Files

```
.claude/agents/tester/
└── CLAUDE.md              # Agent philosophy and test standards

.claude/commands/
└── test-gen.md            # Command definition

.claude/hooks/
└── test-coverage-check.sh # Warn about missing test files
```

## Status

- [x] Agent context defined
- [x] Command for test generation
- [x] Test philosophy documented
- [x] PostToolUse hook for missing test warnings
- [ ] CI integration for coverage gates
