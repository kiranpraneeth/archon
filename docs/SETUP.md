# Setup Guide

This guide covers installing and configuring Archon for your development workflow.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | Required for TypeScript compilation |
| npm | 10+ | Comes with Node.js |
| Claude Code | Latest | [Installation guide](https://docs.anthropic.com/en/docs/claude-code) |
| Git | 2.x | For version control |

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/kiranpraneeth/archon.git
cd archon
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
# Type checking
npm run typecheck

# Run tests
npm run test:run

# Both should complete without errors
```

## Configuration

### Claude Code Settings

Archon uses `.claude/settings.json` for hook configuration. This file is already set up with:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "command": ".claude/hooks/lint-typescript.sh" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "command": ".claude/hooks/format-typescript.sh" },
          { "command": ".claude/hooks/docs-check.sh" },
          { "command": ".claude/hooks/test-coverage-check.sh" }
        ]
      }
    ]
  }
}
```

### Disabling Hooks

To disable a hook temporarily, comment it out in `.claude/settings.json` or create `.claude/settings.local.json` to override.

### GitHub Actions

The automated PR review workflow (`.github/workflows/code-review.yml`) requires:

1. Claude Code GitHub App installed on your repository
2. Repository secrets configured (handled by the app)

See [Autonomous Agents Pattern](../playbook/patterns/autonomous-agents.md) for details.

## Verifying Setup

### Test Each Component

```bash
# 1. Start Claude Code
claude

# 2. Test a command
/review --help

# 3. Make an edit to trigger hooks
# (hooks should run automatically)

# 4. Check hook output
# You should see formatting applied and any warnings
```

### Expected Behavior

When you edit a `.ts` file:
1. **PreToolUse**: ESLint checks run (blocks if errors)
2. **Edit completes**
3. **PostToolUse**: Prettier formats the file
4. **PostToolUse**: Warns if exports lack JSDoc
5. **PostToolUse**: Warns if no test file exists

## Troubleshooting

### "Command not found: claude"

Claude Code CLI is not installed. Follow the [official installation guide](https://docs.anthropic.com/en/docs/claude-code).

### Hooks Not Running

1. Check `.claude/settings.json` exists and is valid JSON
2. Ensure hook scripts are executable: `chmod +x .claude/hooks/*.sh`
3. Check Claude Code is running in the project directory

### TypeScript Errors

```bash
# Check for type errors
npm run typecheck

# If errors exist, they must be fixed before the project will work correctly
```

### Tests Failing

```bash
# Run tests with verbose output
npm run test:run -- --reporter=verbose

# Run a specific test file
npm run test:run -- src/memory/index.test.ts
```

## Next Steps

- [Agents Guide](./AGENTS.md) — Learn how to use each agent
- [Hooks Guide](./HOOKS.md) — Customize quality gates
- [Architecture](./ARCHITECTURE.md) — Understand the codebase
