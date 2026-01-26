# Archon — AI-Native Developer Experience Platform

## Mission
Archon is a platform where AI agents handle the toil of software development — code review, test generation, documentation, dependency updates — while humans focus on architecture and product decisions.

## Project Context
This is a learning-in-public project by Kiran Gamini, an engineering leader building expertise in agentic engineering. The platform serves dual purposes:
1. A production-grade DevEx tool
2. A documented case study in AI agent orchestration

## Architecture Philosophy

### Agentic Team Model
We model AI agents as specialized team members, each with:
- Clear responsibilities
- Defined interfaces with other agents
- Quality standards they must meet
- Escalation paths to human oversight

### The Agent Roster
| Agent | Responsibility | Status |
|-------|---------------|--------|
| Reviewer | Code review, PR feedback | 🔨 Building |
| Tester | Test generation, coverage analysis | 📋 Planned |
| Documenter | Docs sync, README maintenance | 📋 Planned |
| Onboarder | Codebase Q&A, context provision | 📋 Planned |

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: To be decided (likely Fastify or Hono)
- **Database**: PostgreSQL with Drizzle ORM
- **Infrastructure**: Docker, GitHub Actions
- **Agent Orchestration**: Claude Code with MCP servers

## Code Conventions

### TypeScript Standards
- Strict mode enabled
- Prefer `type` over `interface` unless extending
- Use explicit return types on exported functions
- Zod for runtime validation at boundaries

### File Organization
```
src/
├── agents/           # Agent implementations
│   ├── reviewer/     # Code Review Agent
│   ├── tester/       # Test Generation Agent
│   └── shared/       # Cross-agent utilities
├── core/             # Platform core (orchestration, config)
├── integrations/     # External service integrations
└── api/              # HTTP API (if applicable)
```

### Commit Conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Reference agent name in commits: `feat(reviewer): add complexity scoring`
- Keep commits atomic and focused

## Quality Gates
- All code must pass TypeScript strict checks
- Tests required for agent behavior logic
- Human review required for:
  - Changes to agent prompts/context
  - New agent additions
  - Orchestration logic changes

## Documentation Standards
Every agent must have:
1. A CLAUDE.md defining its context
2. A README.md explaining its purpose and usage
3. Examples of expected input/output

## Working Agreements
- Prefer explicit over implicit
- Document decisions and their rationale
- When in doubt, add a human checkpoint
- Optimize for debuggability over cleverness
