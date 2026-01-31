Orchestrated review combining Code Review Agent and Test Coverage Agent.

This command performs a comprehensive review that checks both code quality AND test coverage.

## Agent Contexts

Load these agent contexts:
- `.claude/agents/reviewer/CLAUDE.md` — Code Review Agent philosophy
- `.claude/agents/tester/CLAUDE.md` — Test Generation Agent philosophy

## Instructions

### Phase 1: Code Review (Main Agent)

1. Identify the target files from $ARGUMENTS (or use `git diff --staged` if none specified)
2. Perform a full code review following the Reviewer agent context
3. Store the review results for the combined report

### Phase 2: Test Coverage Analysis (Subagent)

Spawn a **subagent** using the Task tool to analyze test coverage:

```
Use the Task tool with:
- subagent_type: "general-purpose"
- prompt: Load .claude/agents/tester/CLAUDE.md context. For each source file in [list files from Phase 1], check if a corresponding .test.ts file exists and evaluate coverage:
  1. Does a test file exist?
  2. Are all exported functions tested?
  3. Are edge cases covered?
  4. What's missing?
  Do NOT generate tests — only analyze and report gaps.
```

Wait for the subagent to complete before proceeding.

### Phase 3: Combined Report

Output a unified report in this exact format:

```markdown
# Review + Coverage Report

## Code Review

### Summary
[Approve / Request Changes / Needs Discussion]

### Overview
[2-3 sentence summary from Reviewer]

### Feedback
[Blockers, Suggestions, Nitpicks from Reviewer — use standard format]

### What I Liked
[Positives from Reviewer]

---

## Test Coverage Analysis

### Coverage Status
[✅ Adequate / ⚠️ Gaps Found / ❌ Missing Tests]

### Files Analyzed
| File | Test File | Status |
|------|-----------|--------|
| [source] | [test file or "Missing"] | [✅/⚠️/❌] |

### Coverage Gaps
[List of untested functions, missing edge cases, etc.]

### Recommendations
[Specific tests that should be added]

---

## Combined Recommendation

### Overall Status
[✅ Ready to Merge / ⚠️ Merge with Caveats / ❌ Not Ready]

### Checklist
- [ ] Code review: [Approved / Has blockers]
- [ ] Test coverage: [Adequate / Has gaps]
- [ ] Human review required: [Yes/No — reason if yes]

### Action Items
[Numbered list of what needs to happen before merge]
```

## Decision Logic

**Ready to Merge** requires:
- Code review: Approve (no blockers)
- Test coverage: Adequate (all exports tested, key edge cases covered)

**Merge with Caveats** when:
- Code review: Approve
- Test coverage: Minor gaps (missing edge cases, but happy paths covered)

**Not Ready** when:
- Code review has blockers, OR
- Test coverage is missing entirely, OR
- New exported functions have no tests

## Usage Examples

- `/review-with-tests` — Review staged changes with coverage check
- `/review-with-tests src/agents/reviewer/` — Review specific directory
- `/review-with-tests src/core/types.ts` — Review specific file

## Arguments

$ARGUMENTS — Optional: specific files or directories to review. Defaults to staged changes.
