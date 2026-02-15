# Documentation Agent Pattern

> One command, three modes — generate, audit, or smart-detect what needs docs

## What It Does

The Documentation Agent maintains code-documentation alignment. It reads code like an engineer but writes docs for readers at different levels: new devs, experienced devs looking something up, and devs debugging a problem.

**Core responsibilities:**
- Generate JSDoc for exported functions
- Audit existing docs for gaps and staleness
- Flag areas needing human-written content (tutorials, ADRs)

## The Three Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Generate** | `/docs src/file.ts` | Add/update JSDoc for exports in file |
| **Audit** | `/docs --audit src/` | Scan directory, report gaps |
| **Smart** | `/docs` (no args) | Check staged/changed files, suggest updates |

### Mode Selection Logic

```
/docs src/core/types.ts     → Generate mode (path provided)
/docs --audit               → Audit mode (flag present)
/docs --audit src/agents/   → Audit mode (scoped to directory)
/docs                       → Smart mode (infer from git context)
```

**Why one command?** Easier to remember. Users don't need to know `/docs-generate` vs `/docs-audit` vs `/docs-check`. The command figures out what you probably want.

## Example: Audit Output

Running `/docs --audit src/` produces:

```markdown
## Documentation Audit: src/

### 🎯 Reader Impact
Developers building with or extending Archon agents.

### ✅ Well Documented
- `src/core/types.ts`: Exemplary — JSDoc with examples for all exports
- `src/agents/reviewer/README.md`: Comprehensive usage guide

### ⚠️ Needs Improvement
- `createReviewAgent()`: Missing @param/@returns in JSDoc
  - Why it matters: No IDE hints for parameters
  - Suggested fix: Add @param configOverrides, @returns ReviewerAgent

### ❌ Missing Documentation
- `src/core/`: No README explaining the type system

### 📝 Recommendations
1. Add @param/@returns to exported functions — quick IDE win
2. Consider src/core/README.md — one paragraph on type contracts
```

## Closing the Gap: Automated Feedback

The `/docs` command is manual, but we've added a PostToolUse hook that provides automatic feedback.

**Implemented:**
- **PostToolUse hook** (`.claude/hooks/docs-check.sh`): After editing `.ts` files, warns if exports lack JSDoc. Advisory only — doesn't block.

**Remaining opportunities:**
- **CI check**: Fail PRs that add exports without JSDoc
- **Pre-commit**: Block commits with undocumented public APIs

The hook output:
```
📝 Documentation gap in types.ts:
   - L36: FeedbackSeverity (missing JSDoc)
   Run '/docs src/core/types.ts' to generate documentation.
```

This mirrors the lint/format pattern — documentation feedback as part of the edit loop.

## Lesson Learned

**One command with modes beats multiple single-purpose commands.**

Instead of:
- `/docs-generate` — generate docs
- `/docs-audit` — run audit
- `/docs-sync` — update stale docs

We have:
- `/docs [path]` — figures out what you need

**Benefits:**
- Fewer commands to remember
- Consistent interface
- Mode logic lives in one place (easier to maintain)
- Defaults to the most common case (smart detection)

**The pattern:** Design commands that infer intent from context, with explicit flags for override.

## Files

```
.claude/agents/documenter/
└── CLAUDE.md              # Agent philosophy and output standards

.claude/commands/
└── docs.md                # Command definition with mode logic
```

## Status

- [x] Agent context defined
- [x] Command with three modes
- [x] Audit output format specified
- [x] PostToolUse hook for auto-checking (warns, doesn't block)
- [ ] CI integration for PR validation
