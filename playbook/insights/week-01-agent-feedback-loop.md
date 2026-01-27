# Agent Feedback Loop

**Date**: 2026-01-26
**Context**: Building the Code Review Agent for Archon

## Key Learnings

### 1. Agents Need Explicit Format Instructions
Agents take shortcuts without explicit constraints. "Use this format" isn't enough — you need:
- "This format is **mandatory**, not optional"
- "Do not abbreviate, skip sections, or improvise"
- "For empty sections, write 'None' rather than omitting"

### 2. Edge Cases Must Be Specified
If you don't define behavior for edge cases, the agent will improvise inconsistently. Example: "no issues found" reviews were formatted differently each time until I added a Clean Review Example showing the expected output.

### 3. The Refinement Loop
```
Run agent → Evaluate output → Improve context → Repeat
```
Each iteration reveals gaps in the context file. The agent's failures are diagnostic — they show what's underspecified.

### 4. Don't Over-Polish Early
Resist the urge to perfect the agent context file upfront. You won't know what's missing until you see real outputs. Learn the pattern first, optimize later.

### 5. Severity-Based Explanation Depth
Not all feedback needs the same detail level:
- Blockers: Always explain WHY (security risk, data loss, etc.)
- Suggestions: Brief benefit statement
- Nitpicks: No explanation unless non-obvious

This makes reviews scannable while still being informative where it matters.

## Applied To
- `.claude/agents/reviewer/CLAUDE.md` — Output Format section
