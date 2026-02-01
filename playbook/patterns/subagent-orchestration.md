# Subagent Orchestration

> Composing specialized agents into coordinated workflows

## What Are Subagents?

Subagents are agents spawned by other agents to handle specialized tasks. The parent (orchestrator) delegates work, waits for results, and synthesizes the output.

```
Orchestrator (main agent)
    ↓ spawns
Subagent A (specialist)
    ↓ returns results
Orchestrator synthesizes
```

In Claude Code, subagents are spawned via the **Task tool**:
```
Task tool with:
- subagent_type: "general-purpose"
- prompt: [specialized instructions]
```

## The Pattern We Built

`/review-with-tests` orchestrates two agents:

```
┌─────────────────────────────────────────────────┐
│  Phase 1: Code Review (Main Agent)              │
│  - Load reviewer context                        │
│  - Analyze code, output detailed review         │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Phase 2: Test Coverage (Subagent)              │
│  - Spawned via Task tool                        │
│  - Load tester context                          │
│  - Analyze coverage, report gaps                │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Phase 3: Combined Report (Main Agent)          │
│  - Synthesize findings from both phases         │
│  - Single recommendation with action items      │
└─────────────────────────────────────────────────┘
```

### Implementation

From `.claude/commands/review-with-tests.md`:

```markdown
### Phase 2: Test Coverage Analysis (Subagent)

Spawn a **subagent** using the Task tool:

Use the Task tool with:
- subagent_type: "general-purpose"
- prompt: Load .claude/agents/tester/CLAUDE.md context.
  For each source file, check if a test file exists and evaluate:
  1. Does a test file exist?
  2. Are all exported functions tested?
  3. Are edge cases covered?
  Do NOT generate tests — only analyze and report gaps.
```

## Key Lesson: Orchestrators Synthesize, Not Duplicate

**Wrong approach:** Final report repeats everything from Phase 1 and Phase 2.

**Right approach:** Detailed outputs shown during each phase. Final report synthesizes:

```markdown
# Combined Recommendation

## Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| Code Review | Approve | Clean code, no blockers |
| Test Coverage | ✅ Adequate | 28 tests, all exports covered |

## Overall: ✅ Ready to Merge

## Action Items
None
```

The user already saw the details. The orchestrator's job is to **decide**, not **repeat**.

## When to Use Subagents vs Sequential Commands

| Scenario | Approach | Why |
|----------|----------|-----|
| Independent specialized tasks | Subagent | Isolation, focused context |
| Tasks needing different expertise | Subagent | Each agent loads its own context |
| Simple linear workflow | Sequential in same agent | Less overhead |
| Parallel independent work | Multiple subagents | Can run concurrently |
| Tight feedback loop needed | Same agent | Faster iteration |

### Use Subagents When:
- Task requires a different agent persona/context
- You want isolation (subagent can't accidentally affect main task)
- Work can be parallelized
- Specialist knowledge is needed (tester, security reviewer, etc.)

### Stay in Same Agent When:
- Tasks are tightly coupled
- You need immediate access to previous results
- Overhead of spawning isn't worth it
- Simple sequential steps

## MCP Extends Agent Capabilities

Model Context Protocol (MCP) servers give agents access to external services:

```
Agent
  ↓ MCP
GitHub API (issues, PRs, commits)
Database queries
External APIs
File systems
```

**Example:** We used `mcp__github__list_commits` to fetch repo history without writing custom integrations.

MCP servers act as **capability plugins** — agents can use them like built-in tools:

| MCP Server | Capabilities Added |
|------------|-------------------|
| GitHub | Issues, PRs, commits, reviews |
| Filesystem | Read/write files outside sandbox |
| Database | Query data stores |
| Custom | Any API you wrap |

### Combining Subagents + MCP

Powerful pattern: Orchestrator delegates to subagents, each with MCP access:

```
Orchestrator
    ├── Subagent: PR Reviewer (uses GitHub MCP for diff)
    ├── Subagent: Test Analyzer (uses filesystem MCP)
    └── Synthesizes results
```

## Best Practices

1. **Clear handoff** — Tell subagent exactly what to do and what to return
2. **Don't over-orchestrate** — If one agent can do it, don't add complexity
3. **Synthesize at the end** — Orchestrator adds value by deciding, not repeating
4. **Load context per agent** — Each subagent should load its own CLAUDE.md
5. **Wait for completion** — Don't proceed until subagent returns (unless parallelizing)
