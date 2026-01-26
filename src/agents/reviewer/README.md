# Code Review Agent

> Automated code review with context-aware, constructive feedback

## Overview

The Code Review Agent is Archon's first AI team member. It reviews code changes and provides structured feedback following the team's quality standards.

## Philosophy

This agent is designed to be a **constructive teammate**, not a harsh gatekeeper:

- Assumes competence — asks questions before making accusations
- Prioritizes feedback by severity (🔴 Blocker → 🟡 Suggestion → 🟢 Nitpick)
- Always includes positive observations
- Knows when to escalate to human reviewers

## Usage

### Via Claude Code Command

```bash
# Review staged changes
/review

# Review specific files
/review src/agents/

# Review for PR submission
/review --pr
```

### Programmatically

```typescript
import { createReviewAgent, formatReviewAsMarkdown } from './agents/reviewer';

const agent = createReviewAgent({
  minSeverity: 'suggestion', // Skip nitpicks
  maxFilesPerReview: 10,
});

// The actual review is performed by Claude Code
// using the agent context in .claude/agents/reviewer/CLAUDE.md
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `maxFilesPerReview` | 20 | Maximum files in one review pass |
| `excludePatterns` | `['*.lock', 'dist/**', ...]` | Files to skip |
| `includePositives` | true | Include "What I Liked" section |
| `minSeverity` | 'nitpick' | Minimum severity to report |

## Output Format

Reviews follow a structured format:

```markdown
## Summary
[Approve / Request Changes / Needs Discussion]

## Overview
[Brief assessment]

## 🔴 Blockers
- [Critical issues that must be fixed]

## 🟡 Suggestions
- [Recommended improvements]

## 🟢 Nitpicks
- [Minor style/preference items]

## What I Liked
- [Positive observations]

## Questions
- [Clarifications needed from author]
```

## Capabilities

| Capability | Enabled | Reason |
|------------|---------|--------|
| Modify files | ❌ | Read-only — reviews but doesn't change |
| Execute commands | ✅ | Needs git access for diffs |
| Network access | ❌ | No external dependencies |
| Autonomous action | ❌ | Recommends only, human approves |

## Escalation Triggers

The agent flags for mandatory human review when:

- Security vulnerabilities detected
- Architecture changes identified
- Breaking changes to public APIs
- Unclear requirements or scope

## Files

```
src/agents/reviewer/
├── index.ts              # Agent implementation
└── README.md             # This file

.claude/agents/reviewer/
└── CLAUDE.md             # Agent context (personality, guidelines)

.claude/commands/
└── review.md             # Claude Code command definition
```

## Development

The agent consists of two parts:

1. **TypeScript module** (`src/agents/reviewer/`): Type definitions, configuration, output formatting
2. **Claude context** (`.claude/agents/reviewer/CLAUDE.md`): Review philosophy, checklists, behavioral guidelines

To modify the agent's behavior:
- Adjust review philosophy → Edit `.claude/agents/reviewer/CLAUDE.md`
- Adjust configuration options → Edit `src/agents/reviewer/index.ts`
- Adjust output format → Edit `formatReviewAsMarkdown()`
