# Agents Guide

Archon includes several AI agents, each specialized for a specific development task. This guide covers how to use each one.

## Overview

| Agent | Command | Purpose |
|-------|---------|---------|
| [Reviewer](#code-review-agent) | `/review` | Automated code review |
| [Tester](#test-generation-agent) | `/test-gen` | Generate unit tests |
| [Documenter](#documentation-agent) | `/docs` | Documentation management |
| [Orchestrator](#orchestrated-review) | `/review-with-tests` | Combined workflows |

---

## Code Review Agent

The Reviewer provides automated code review with context-aware, constructive feedback.

### Usage

```bash
# Review staged changes
/review

# Review specific files
/review src/agents/

# Review for PR submission
/review --pr
```

### Output Format

Reviews are structured with severity levels:

- **🔴 Blockers** — Must fix before merge (bugs, security issues)
- **🟡 Suggestions** — Should consider (code quality, maintainability)
- **🟢 Nitpicks** — Optional (style preferences)

Example output:
```markdown
## Summary
🔄 Request Changes

## Overview
Found a potential SQL injection vulnerability that needs addressing.

## 🔴 Blockers
- **[src/db.ts:42]**: User input passed directly to query
  - Why: SQL injection risk
  - Suggestion: Use parameterized queries

## What I Liked
- Clean separation of concerns
- Good test coverage
```

### Customization

The agent's behavior is defined in `.claude/agents/reviewer/CLAUDE.md`. Edit this file to:
- Adjust review strictness
- Add project-specific guidelines
- Modify escalation triggers

### Escalation Triggers

The agent flags for mandatory human review when:
- Security vulnerabilities detected
- Architecture changes identified
- Breaking changes to public APIs
- Unclear requirements

---

## Test Generation Agent

The Tester generates comprehensive unit tests following best practices.

### Usage

```bash
# Generate tests for a file
/test-gen src/utils/validate.ts

# Generate tests for a module
/test-gen src/agents/reviewer/
```

### What It Generates

For each exported function, the agent creates:
- Happy path tests
- Edge case tests (empty inputs, boundaries)
- Error condition tests
- Async behavior tests (if applicable)

### Test Philosophy

The agent follows these principles:
- **Test behavior, not implementation** — Tests verify what code does, not how
- **Readable test names** — `should [verb] [outcome] when [condition]`
- **One assertion per test** — Each test verifies one behavior
- **Proper mocking** — External dependencies mocked, internal code tested directly

### Output Location

Tests are placed alongside source files:
```
src/utils/validate.ts      → src/utils/validate.test.ts
src/agents/reviewer/index.ts → src/agents/reviewer/index.test.ts
```

### Customization

Edit `.claude/agents/tester/CLAUDE.md` to:
- Adjust test coverage expectations
- Add project-specific testing patterns
- Configure mocking preferences

---

## Documentation Agent

The Documenter manages code documentation with three modes.

### Usage

```bash
# Generate JSDoc for a file
/docs src/core/types.ts

# Audit documentation in a directory
/docs --audit src/

# Smart mode (check what needs updating)
/docs
```

### Modes

#### Generate Mode
Adds or updates JSDoc comments for exported functions:
```bash
/docs src/memory/types.ts
```

#### Audit Mode
Scans for documentation gaps:
```bash
/docs --audit src/
```

Output:
```markdown
## Documentation Audit: src/

### ✅ Well Documented
- `src/core/types.ts`: Complete JSDoc with examples

### ⚠️ Needs Improvement
- `createReviewAgent()`: Missing @param/@returns

### ❌ Missing Documentation
- `src/memory/`: No README
```

#### Smart Mode
Checks staged/changed files and suggests what needs documentation:
```bash
/docs
```

### Documentation Philosophy

The agent follows these principles:
- **Reader first** — Write for the person reading, not the code
- **Answer WHY, not just WHAT** — Explain purpose, not just mechanics
- **Progressive disclosure** — Summary → Quick start → Full reference

### Customization

Edit `.claude/agents/documenter/CLAUDE.md` to:
- Adjust documentation standards
- Add project-specific conventions
- Configure what triggers "missing doc" warnings

---

## Orchestrated Review

The `/review-with-tests` command combines multiple agents in a workflow.

### Usage

```bash
# Review code AND generate missing tests
/review-with-tests src/new-feature/
```

### What It Does

1. **Code Review Agent** reviews the code
2. **Test Generation Agent** identifies missing tests
3. Combined report with both review feedback and test suggestions

### When to Use

- Before opening a PR (comprehensive check)
- When adding new features (ensure test coverage)
- During refactoring (verify nothing broke)

---

## Creating Custom Agents

To add a new agent:

1. **Create agent context**: `.claude/agents/{name}/CLAUDE.md`
2. **Create command**: `.claude/commands/{name}.md`
3. **Optionally add TypeScript**: `src/agents/{name}/`

See [Architecture Guide](./ARCHITECTURE.md) for details on the agent structure.

---

## Agent Contexts

Each agent has a `CLAUDE.md` file defining its:
- **Identity** — Who it is and its role
- **Responsibilities** — What it does
- **Philosophy** — How it approaches tasks
- **Output format** — Expected structure
- **Limitations** — What it cannot do
- **Escalation triggers** — When to involve humans

These contexts are loaded when you run the corresponding command, giving Claude Code the specialized knowledge it needs.
