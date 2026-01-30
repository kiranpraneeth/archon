# Hooks as Quality Gates

> Automated policies that enforce standards without human intervention

## The Pattern

Claude Code hooks let you run scripts before or after tool operations. Use them to enforce quality standards automatically — the agent can't bypass them.

| Hook Type | When It Runs | Use Case |
|-----------|--------------|----------|
| PreToolUse | Before the tool executes | Block operations that violate standards |
| PostToolUse | After the tool executes | Clean up or transform output |

## PreToolUse: The Gatekeeper

**Purpose:** Prevent bad changes from being made.

**Example:** Lint checking before edits

```bash
# .claude/hooks/lint-typescript.sh
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip non-TypeScript files
if [[ ! "$file_path" =~ \.tsx?$ ]]; then
  exit 0
fi

# Run linter
lint_output=$(npx eslint "$file_path" 2>&1)

if [[ $? -eq 1 ]]; then
  error_count=$(echo "$lint_output" | grep -c " error ")
  if [[ $error_count -gt 0 ]]; then
    echo "ESLint errors found. Fix before editing." >&2
    exit 2  # Block the edit
  fi
fi

exit 0  # Allow the edit
```

**Configuration:**
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-typescript.sh"
      }]
    }]
  }
}
```

**Key behavior:**
- Exit 0 → allow the operation
- Exit 2 → block the operation
- Stderr output shown to the agent as feedback

## PostToolUse: The Cleaner

**Purpose:** Normalize output after changes are made.

**Example:** Auto-format after edits

```bash
# .claude/hooks/format-typescript.sh
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip non-TypeScript files
if [[ ! "$file_path" =~ \.tsx?$ ]]; then
  exit 0
fi

# Check if prettier is available
if ! npx prettier --version &> /dev/null 2>&1; then
  echo "Prettier not installed, skipping" >&2
  exit 0
fi

# Format the file
npx prettier --write "$file_path" 2>&1
exit 0  # Don't block on format failures
```

**Configuration:**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format-typescript.sh"
      }]
    }]
  }
}
```

**Key behavior:**
- Always exit 0 — formatting failures shouldn't block completed edits
- Runs after the file is written
- Agent sees the formatted result on subsequent reads

## When to Use Which

| Scenario | Hook Type | Reasoning |
|----------|-----------|-----------|
| Lint errors | PreToolUse | Block bad code from entering |
| Security scanning | PreToolUse | Prevent vulnerabilities |
| Auto-formatting | PostToolUse | Clean up after valid edits |
| License headers | PostToolUse | Add boilerplate after creation |
| Secrets detection | PreToolUse | Block before secrets are written |
| Import sorting | PostToolUse | Normalize style post-write |

**Rule of thumb:**
- PreToolUse = "Should this change happen?" (gatekeeper)
- PostToolUse = "Now that it happened, clean it up" (janitor)

## Hook Input Format

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

Extract with jq:
```bash
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
```

## Best Practices

1. **Fail gracefully** — Missing tools shouldn't block work
   ```bash
   if ! command -v npx &> /dev/null; then
     exit 0  # Skip, don't fail
   fi
   ```

2. **Filter by file type** — Don't run TypeScript lint on Python files
   ```bash
   if [[ ! "$file_path" =~ \.tsx?$ ]]; then
     exit 0
   fi
   ```

3. **Provide actionable feedback** — Tell the agent what to fix
   ```bash
   echo "ESLint errors in $file_path:" >&2
   echo "$lint_output" >&2
   echo "Fix these before editing." >&2
   ```

4. **Keep hooks fast** — They run on every matching operation

## The Combined Pattern

PreToolUse and PostToolUse work together as a quality pipeline:

```
Edit request
    ↓
PreToolUse: lint-typescript.sh
    ↓ (blocks if errors)
File modified
    ↓
PostToolUse: format-typescript.sh
    ↓ (formats the result)
Done
```

The agent can't write code with lint errors, and all code ends up consistently formatted.
