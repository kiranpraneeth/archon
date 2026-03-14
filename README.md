# Archon

> AI-Native Developer Experience Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-546%20passing-brightgreen)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-blue)]()

Archon is a platform where AI agents handle development toil — code review, test generation, documentation — while you focus on architecture and product decisions.

## Features

### Agents

| Agent | Command | What It Does |
|-------|---------|--------------|
| **Reviewer** | `/review` | Automated code review with severity levels |
| **Tester** | `/test-gen` | Generate unit tests for your code |
| **Documenter** | `/docs` | Generate JSDoc, audit documentation gaps |
| **Planner** | `/plan` | Parse PRDs and generate technical specifications |
| **Developer** | `/develop` | Code generation with pattern detection |
| **Deployer** | — | Build automation, release notes, git tagging |
| **Monitor** | — | Metrics tracking and error aggregation |

### Orchestration

| Workflow | Command | What It Does |
|----------|---------|--------------|
| **Review + Tests** | `/review-with-tests` | Combined code review and test generation |
| **SDLC Orchestrator** | `/sdlc-run` | Full SDLC workflow from planning to monitoring |

**Quality Hooks** (run automatically):
- Lint checking before edits
- Auto-formatting after edits
- Documentation gap warnings
- Missing test file warnings

**Infrastructure**:
- GitHub Action for automated PR reviews
- Pluggable memory system for agent context
- Playbook documenting agentic patterns
- 16 MCP servers for external integrations (Slack, Jira, Google Workspace, etc.)

## Quick Start

### Prerequisites

- Node.js 20+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/kiranpraneeth/archon.git
cd archon

# Install dependencies
npm install

# Verify installation
npm run typecheck
npm run test:run
```

### First Commands

```bash
# Start Claude Code in the project
claude

# Review staged changes
/review

# Generate tests for a file
/test-gen src/core/types.ts

# Audit documentation
/docs --audit src/
```

## Documentation

- [Setup Guide](./docs/SETUP.md) — Installation and configuration
- [Agents Guide](./docs/AGENTS.md) — How to use each agent
- [SDLC Workflow](./docs/SDLC_WORKFLOW.md) — Complete development lifecycle orchestration
- [MCP Servers](./docs/MCP_SERVERS.md) — External integrations (Slack, Jira, Google Workspace, etc.)
- [Hooks Guide](./docs/HOOKS.md) — Quality gate automation
- [Architecture](./docs/ARCHITECTURE.md) — Project structure and extensibility
- [Contributing](./CONTRIBUTING.md) — How to contribute

## The Agentic Engineering Playbook

Archon is also a **learning-in-public project**. The [Playbook](./playbook/) documents patterns and lessons learned:

- [Hooks as Quality Gates](./playbook/patterns/hooks-quality-gates.md)
- [Subagent Orchestration](./playbook/patterns/subagent-orchestration.md)
- [Autonomous Agents](./playbook/patterns/autonomous-agents.md)
- [Documentation Agent Pattern](./playbook/patterns/documentation-agent.md)
- [Test Generation Pattern](./playbook/patterns/test-generation-agent.md)
- [SDLC Orchestration Pattern](./playbook/patterns/sdlc-orchestration.md)

## Project Structure

```
archon/
├── src/
│   ├── agents/              # Agent implementations
│   │   ├── reviewer/        # Code Review Agent
│   │   ├── tester/          # Test Generation Agent
│   │   ├── documenter/      # Documentation Agent
│   │   ├── planner/         # Planning Agent
│   │   ├── developer/       # Development Agent
│   │   ├── deployer/        # Deployment Agent
│   │   └── monitor/         # Monitoring Agent
│   ├── orchestrator/        # SDLC Workflow Orchestrator
│   ├── core/                # Shared types and schemas
│   └── memory/              # Pluggable memory system
├── .claude/
│   ├── agents/              # Agent personas (CLAUDE.md files)
│   ├── commands/            # Slash command definitions
│   └── hooks/               # Quality gate scripts
├── .github/workflows/       # GitHub Actions (PR review)
├── playbook/                # Agentic Engineering Playbook
└── docs/                    # Documentation
```

## Philosophy

### Agents Augment, Not Replace

AI agents handle the repetitive tasks that slow engineers down. Humans remain in control of architecture, product decisions, and anything consequential.

### Human-in-the-Loop by Default

Agents recommend. Humans decide. Every critical action has a checkpoint.

### Observable and Debuggable

Clear agent contexts, structured output, and transparent reasoning make it easy to understand and override agent behavior.

## Author

Built by **Kiran Gamini** — exploring the future of engineering in an AI-native world.

## License

[MIT](./LICENSE)
