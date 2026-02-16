# Hooks Guide

Archon uses Claude Code hooks to enforce quality standards automatically. This guide explains what hooks are available and how to customize them.

## What Are Hooks?

Hooks are scripts that run before or after Claude Code tool operations. They enable:
- **Automated quality gates** — Block bad changes before they happen
- **Consistent formatting** — Auto-format code after edits
- **Proactive warnings** — Alert about missing tests or documentation

## Available Hooks

### PreToolUse Hooks

Run **before** Edit or Write operations.

| Hook | Purpose | Behavior |
|------|---------|----------|
| `lint-typescript.sh` | ESLint validation | Blocks edit if lint errors exist |

### PostToolUse Hooks

Run **after** Edit or Write operations.

| Hook | Purpose | Behavior |
|------|---------|----------|
| `format-typescript.sh` | Prettier formatting | Auto-formats the file |
| `docs-check.sh` | Documentation gaps | Warns if exports lack JSDoc |
| `test-coverage-check.sh` | Missing tests | Warns if no test file exists |

## Hook Pipeline

When you edit a TypeScript file, this pipeline runs:

```
Edit request
    ↓
┌─────────────────────────────────┐
│ PreToolUse: lint-typescript.sh  │
│ - Runs ESLint                   │
│ - Exit 0: proceed               │
│ - Exit 2: block edit            │
└─────────────────────────────────┘
    ↓
File modified
    ↓
┌─────────────────────────────────┐
│ PostToolUse: format-typescript  │
│ - Runs Prettier                 │
│ - Always proceeds (exit 0)      │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ PostToolUse: docs-check.sh      │
│ - Checks for missing JSDoc      │
│ - Warns via stderr              │
│ - Always proceeds (advisory)    │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ PostToolUse: test-coverage      │
│ - Checks for test file          │
│ - Warns via stderr              │
│ - Always proceeds (advisory)    │
└─────────────────────────────────┘
    ↓
Done
```

## Configuration

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-typescript.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format-typescript.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/docs-check.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/test-coverage-check.sh"
          }
        ]
      }
    ]
  }
}
```

### Disabling a Hook

Comment out or remove the hook entry:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "command": ".claude/hooks/format-typescript.sh" }
          // docs-check.sh removed
          // test-coverage-check.sh removed
        ]
      }
    ]
  }
}
```

### Local Overrides

Create `.claude/settings.local.json` for personal overrides (not committed):

```json
{
  "hooks": {
    "PreToolUse": [],
    "PostToolUse": []
  }
}
```

## Creating Custom Hooks

### Hook Structure

```bash
#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract file path
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip non-applicable files
if [[ ! "$file_path" =~ \.tsx?$ ]]; then
  exit 0
fi

# Your logic here
# ...

# Exit codes:
# 0 = proceed (or success)
# 2 = block operation (PreToolUse only)
exit 0
```

### Hook Input Format

Hooks receive JSON on stdin:

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "...",
    "new_string": "..."
  }
}
```

### Exit Codes

| Code | PreToolUse | PostToolUse |
|------|------------|-------------|
| 0 | Allow operation | Success |
| 2 | Block operation | (ignored) |

### Output

- **stdout** — Ignored
- **stderr** — Shown to the agent as feedback

### Example: Custom Security Check

```bash
#!/bin/bash
# .claude/hooks/security-check.sh

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Check for hardcoded secrets
if grep -qE "(password|secret|api_key)\s*=\s*['\"]" "$file_path" 2>/dev/null; then
  echo "Security: Possible hardcoded secret in $file_path" >&2
  exit 2  # Block the edit
fi

exit 0
```

Register it:
```json
{
  "PreToolUse": [{
    "matcher": "Edit|Write",
    "hooks": [{ "command": ".claude/hooks/security-check.sh" }]
  }]
}
```

## Best Practices

1. **Fail gracefully** — Missing tools shouldn't block work
   ```bash
   if ! command -v npx &> /dev/null; then
     exit 0  # Skip, don't fail
   fi
   ```

2. **Filter by file type** — Don't run TypeScript lint on Python
   ```bash
   if [[ ! "$file_path" =~ \.tsx?$ ]]; then
     exit 0
   fi
   ```

3. **Provide actionable feedback** — Tell the agent what to fix
   ```bash
   echo "ESLint: $error_count errors in $file_path" >&2
   echo "Fix these before editing." >&2
   ```

4. **Keep hooks fast** — They run on every matching operation

## Troubleshooting

### Hooks Not Running

1. Verify `.claude/settings.json` is valid JSON
2. Check scripts are executable: `chmod +x .claude/hooks/*.sh`
3. Ensure `jq` is installed (used for JSON parsing)

### Hook Blocking Unexpectedly

1. Run the hook manually to see output:
   ```bash
   echo '{"tool_input":{"file_path":"src/test.ts"}}' | .claude/hooks/lint-typescript.sh
   ```
2. Check the exit code: `echo $?`

### Warnings Not Appearing

Hook stderr may not surface in all contexts. Test manually:
```bash
echo '{"tool_input":{"file_path":"src/test.ts"}}' | .claude/hooks/docs-check.sh 2>&1
```
