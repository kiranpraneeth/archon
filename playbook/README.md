# The Agentic Engineering Playbook

> A practitioner's guide to building and managing AI agent systems

## What This Is

This playbook documents my journey from traditional engineering management to **agentic engineering management** — orchestrating both human engineers and AI agents to build production systems.

Every pattern here is battle-tested on the [Archon platform](../README.md). Nothing is theoretical.

## Core Mental Models

### The Fundamental Insight

> Managing AI agents is remarkably similar to managing human engineers — you provide context, set expectations, review output, and coordinate work. The mechanisms differ, but the principles transfer.

| Human Team | Agent Team |
|------------|------------|
| Onboarding docs | CLAUDE.md context files |
| Team meetings | Orchestration prompts |
| Code review | Human-in-the-loop checkpoints |
| 1:1 feedback | Prompt refinement |
| Standard operating procedures | Custom commands |
| Quality gates | Hooks |

### The Three Responsibilities of an Agentic Manager

1. **Context Engineering**: Giving agents the right information to make good decisions
2. **Orchestration Design**: Defining how agents work together and with humans
3. **Quality Governance**: Ensuring agent output meets standards before it matters

## Playbook Contents

### Insights (Weekly Reflections)

| Week | Topic | Key Learning |
|------|-------|--------------|
| [Week 1](./insights/week-01-mental-model.md) | The Agentic Manager Mental Model | *Coming soon* |

### Patterns (Reusable Approaches)

| Pattern | Problem It Solves | Status |
|---------|-------------------|--------|
| [Hooks as Quality Gates](./patterns/hooks-quality-gates.md) | Automated policies via PreToolUse/PostToolUse | ✅ Done |
| [Context Hierarchy](./patterns/context-hierarchy.md) | How to structure CLAUDE.md files | 📋 Planned |
| [Agent Delegation](./patterns/agent-delegation.md) | When and how to use subagents | 📋 Planned |
| [Human Checkpoints](./patterns/human-checkpoints.md) | Designing review gates | 📋 Planned |

## How to Use This Playbook

**If you're new to agentic engineering:**
1. Start with [Week 1](./insights/week-01-mental-model.md) for the mental model
2. Review the [Context Hierarchy](./patterns/context-hierarchy.md) pattern
3. Try applying it to your own project

**If you're already building with AI agents:**
- Browse patterns for specific challenges
- Compare your approaches to what's documented here
- Contribute your own learnings via issues/PRs

## Principles That Guide This Work

1. **Agents are collaborators, not magic**: They need context, guidance, and oversight
2. **Explicit over implicit**: When in doubt, write it down in CLAUDE.md
3. **Human-in-the-loop by default**: Remove human checkpoints deliberately, not accidentally
4. **Debuggability over cleverness**: Agent systems fail in novel ways — make them observable
5. **Progressive trust**: Give agents more autonomy as they prove reliability

## Following Along

This playbook grows weekly as the Archon platform develops:
- ⭐ Star the repo to follow updates
- 💼 [LinkedIn](https://linkedin.com) for executive-level insights
- 🐛 Open issues for questions or suggestions

---

*"The future of engineering management isn't replacing humans with AI — it's learning to manage both."*
