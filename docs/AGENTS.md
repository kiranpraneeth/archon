# Agents Guide

Archon includes several AI agents, each specialized for a specific development task. This guide covers how to use each one.

## Overview

| Agent | Command | Purpose |
|-------|---------|---------|
| [Reviewer](#code-review-agent) | `/review` | Automated code review |
| [Tester](#test-generation-agent) | `/test-gen` | Generate unit tests |
| [Documenter](#documentation-agent) | `/docs` | Documentation management |
| [Planner](#planning-agent) | `/plan` | PRD parsing and technical specs |
| [Developer](#development-agent) | `/develop` | Code generation and analysis |
| [Deployer](#deployment-agent) | — | Build automation and releases |
| [Monitor](#monitoring-agent) | — | Metrics and error tracking |

### Orchestration

| Workflow | Command | Purpose |
|----------|---------|---------|
| [Review + Tests](#orchestrated-review) | `/review-with-tests` | Combined review and testing |
| [SDLC Workflow](#sdlc-orchestrator) | `/sdlc-run` | Complete development lifecycle |

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

## Planning Agent

The Planner parses PRDs and generates technical specifications.

### Usage

```bash
# Generate technical spec from a PRD
/plan docs/PRD_FEATURE.md

# Plan with specific focus
/plan --focus architecture docs/PRD_FEATURE.md
```

### What It Generates

- **Requirements Analysis**: Must-have, should-have, nice-to-have priorities
- **Architecture**: File structure and component dependencies
- **Technical Tasks**: Ordered tasks with complexity estimates
- **Risk Assessment**: Critical, high, medium, low severity risks
- **Dependencies**: External services and libraries needed

### Output Format

```markdown
## Technical Specification: Feature Name

### Requirements
- [MUST] Core functionality requirement
- [SHOULD] Secondary requirement
- [NICE] Optional enhancement

### Architecture
Files to create/modify with rationale.

### Tasks
1. [setup] Initialize project structure (simple)
2. [feature] Implement core logic (moderate)
3. [testing] Add test coverage (simple)

### Risks
🔴 CRITICAL: API rate limiting could block integration
🟡 MEDIUM: Deployment requires new infrastructure
```

### Customization

Edit `.claude/agents/planner/CLAUDE.md` to:
- Adjust complexity thresholds
- Add project-specific risk categories
- Configure task estimation rules

---

## Development Agent

The Developer generates code and analyzes patterns.

### Usage

```bash
# Generate code from a technical spec
/develop --generate specs/feature-spec.md

# Analyze existing code for patterns
/develop --analyze src/core/
```

### Modes

#### Generate Mode
Creates new code based on specifications:
- Source files with proper structure
- Type definitions
- Pattern adherence

#### Analyze Mode
Reviews existing code for:
- Design patterns (factory, singleton, observer, etc.)
- Anti-patterns and code smells
- Refactoring opportunities with effort estimates

### Output Format

```markdown
## Code Generation Result

### Files Generated
| File | Lines | Description |
|------|-------|-------------|
| src/feature.ts | 142 | Core implementation |
| src/feature.test.ts | 89 | Unit tests |

### Patterns Detected
- [DP] Factory Pattern in createAgent()
- [CS] Long method detected in processData()

### Refactoring Suggestions
- [EF] Extract validateInput() from process() (small effort)
```

### Customization

Edit `.claude/agents/developer/CLAUDE.md` to:
- Add project coding standards
- Configure pattern detection rules
- Set refactoring thresholds

---

## Deployment Agent

The Deployer automates builds, releases, and deployments.

### Capabilities

- **Build Automation**: Run build steps, collect artifacts
- **Release Notes**: Auto-generate from commits
- **Git Tagging**: Semantic versioning
- **Deployment**: Environment-aware deployments

### Output Formats

#### Build Result
```markdown
## Build Report
✅ Build successful (2m 34s)

### Steps
✅ lint (12s)
✅ typecheck (28s)
✅ test (1m 45s)
✅ build (9s)

### Artifacts
- dist/bundle.js (245 KB)
- dist/bundle.js.map (892 KB)
```

#### Release Notes
```markdown
## v1.2.0 Release Notes

### ✨ Features
- Add user authentication (#42)
- Implement dashboard analytics (#45)

### 🐛 Bug Fixes
- Fix memory leak in cache (#48)

### ⚠️ Breaking Changes
- Removed deprecated `oldApi()` function
```

### Configuration

The deployer requires human approval for production deployments. Edit `.claude/agents/deployer/CLAUDE.md` to configure:
- Build step sequences
- Release note templates
- Environment restrictions

---

## Monitoring Agent

The Monitor tracks metrics and aggregates errors.

### Capabilities

- **Metrics Tracking**: Build times, test counts, coverage
- **Error Aggregation**: Group and analyze errors
- **Health Checks**: System status monitoring
- **Alerting**: Critical issue notifications

### Output Formats

#### Metrics Report
```markdown
## Metrics Report (2024-03-13)

### Health Status
✅ Build pipeline: Healthy
⚠️ Test coverage: Degraded (78% < 80%)
✅ Deployment: Healthy

### Active Alerts
🔴 CRITICAL: Memory usage exceeds threshold
⚠️ WARNING: Response time degraded

### Trends
📈 Build time: +12% (investigate)
📉 Error rate: -8% (improving)
```

#### Error Report
```markdown
## Error Report

### Summary
- Total errors: 42
- Unique errors: 8
- Most affected: src/api/handler.ts

### Top Errors
1. [BUILD] TypeScript compilation failed (15 occurrences)
2. [TEST] Timeout in integration tests (12 occurrences)
```

### Customization

Edit `.claude/agents/monitor/CLAUDE.md` to:
- Set metric thresholds
- Configure alert severities
- Define error categories

---

## SDLC Orchestrator

The orchestrator coordinates the complete software development lifecycle.

### Usage

```bash
# Run full SDLC workflow
/sdlc-run --prd docs/PRD_FEATURE.md

# Run from a specific phase
/sdlc-run --from development

# Skip specific phases
/sdlc-run --skip review
```

### Workflow Phases

```
Planning → Development → Testing → Review → Deployment → Monitoring
```

Each phase:
1. Runs the responsible agent
2. Collects artifacts (specs, code, reports)
3. Passes context to the next phase
4. May require human approval (checkpoints)

### Human Checkpoints

By default, human approval is required at:
- **Review phase**: Before proceeding to deployment
- **Deployment phase**: Before production release

### Failure Handling

- Automatic retry for transient failures
- Rollback capability for deployments
- Max iteration limits prevent infinite loops

### Configuration

See [SDLC Workflow Guide](./SDLC_WORKFLOW.md) for detailed configuration.

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
