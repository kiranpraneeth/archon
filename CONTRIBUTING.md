# Contributing to Archon

Thank you for your interest in contributing to Archon! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and inclusive. We're building tools to help developers — let's make the community welcoming too.

## Getting Started

### Prerequisites

- Node.js 20+
- Claude Code CLI installed
- Git

### Setup

```bash
git clone https://github.com/kiranpraneeth/archon.git
cd archon
npm install
npm run typecheck
npm run test:run
```

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/kiranpraneeth/archon/issues) first
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node version, OS)

### Suggesting Features

1. Check existing issues and discussions
2. Create an issue describing:
   - The problem you're solving
   - Your proposed solution
   - Alternatives considered

### Submitting Code

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feat/my-feature`
3. **Make changes** following our conventions
4. **Test**: `npm run test:run`
5. **Type check**: `npm run typecheck`
6. **Commit**: Use conventional commits (see below)
7. **Push**: `git push origin feat/my-feature`
8. **Open PR**: Describe what and why

## Code Conventions

### TypeScript

- Strict mode enabled
- Prefer `type` over `interface` unless extending
- Explicit return types on exported functions
- Use Zod for runtime validation at boundaries

### File Organization

```
src/
├── agents/{name}/        # Agent implementations
│   ├── index.ts          # Main code
│   ├── index.test.ts     # Tests
│   └── README.md         # Documentation
├── core/                 # Shared types
└── memory/               # Memory system
```

### Naming

- Files: `kebab-case.ts`
- Types: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Tests

- Place tests alongside source: `file.ts` → `file.test.ts`
- Use descriptive names: `should [verb] [outcome] when [condition]`
- One logical assertion per test
- Cover happy path, edge cases, and errors

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that doesn't fix/add |
| `test` | Adding or fixing tests |
| `chore` | Build, tooling, etc. |

### Scopes

| Scope | What It Covers |
|-------|----------------|
| `reviewer` | Code Review Agent |
| `tester` | Test Generation Agent |
| `documenter` | Documentation Agent |
| `memory` | Memory system |
| `core` | Shared types |
| `hooks` | Quality gate hooks |
| `playbook` | Playbook content |

### Examples

```
feat(reviewer): add complexity scoring
fix(memory): handle empty search results
docs(playbook): add context hierarchy pattern
test(core): add edge cases for FeedbackItemSchema
refactor(hooks): extract common file filtering
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass: `npm run test:run`
- [ ] Types check: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Commits follow conventions
- [ ] PR description explains what and why

### PR Title

Use conventional commit format:
```
feat(scope): description
```

### PR Description Template

```markdown
## What

Brief description of the change.

## Why

What problem does this solve?

## How

How does the implementation work?

## Testing

How was this tested?

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Types are correct
```

### Review Process

1. Maintainer reviews within a few days
2. Address feedback or discuss
3. Once approved, maintainer merges

## Adding New Agents

To add a new agent:

1. Create agent context: `.claude/agents/{name}/CLAUDE.md`
2. Create command: `.claude/commands/{name}.md`
3. Add TypeScript (if needed): `src/agents/{name}/`
4. Add tests: `src/agents/{name}/index.test.ts`
5. Document in `docs/AGENTS.md`
6. Add playbook pattern if applicable

See [Architecture Guide](./docs/ARCHITECTURE.md) for details.

## Adding Playbook Content

The playbook documents patterns and lessons learned:

- **Patterns** (`playbook/patterns/`): Reusable approaches
- **Insights** (`playbook/insights/`): Specific learnings

Follow existing format. Include:
- Clear problem statement
- Solution with code examples
- Lessons learned

## Questions?

- Open a [Discussion](https://github.com/kiranpraneeth/archon/discussions)
- Check existing issues
- Read the [docs](./docs/)

Thank you for contributing!
