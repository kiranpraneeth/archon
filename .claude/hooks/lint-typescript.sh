#!/bin/bash
#
# PreToolUse hook: Run ESLint before editing TypeScript files
#
# Blocks edits if ESLint finds errors (exit code 2)
# Allows edits if clean or only warnings (exit code 0)
#

# Read JSON input from stdin
input=$(cat)

# Extract file path from tool input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a TypeScript file
if [[ -z "$file_path" ]] || [[ ! "$file_path" =~ \.tsx?$ ]]; then
  exit 0
fi

# Skip if file doesn't exist yet (new file creation)
if [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Run ESLint on the file
# --max-warnings 0 would fail on warnings too, but we only want to block on errors
lint_output=$(npx eslint "$file_path" 2>&1)
lint_exit_code=$?

# ESLint exit codes:
#   0 = no errors or warnings
#   1 = linting errors found
#   2 = config/fatal error

if [[ $lint_exit_code -eq 1 ]]; then
  # Check if there are actual errors (not just warnings)
  error_count=$(echo "$lint_output" | grep -c " error ")

  if [[ $error_count -gt 0 ]]; then
    echo "ESLint found errors in $file_path:" >&2
    echo "" >&2
    echo "$lint_output" >&2
    echo "" >&2
    echo "Fix these errors before editing." >&2
    exit 2  # Block the edit
  fi
fi

if [[ $lint_exit_code -eq 2 ]]; then
  echo "ESLint configuration error:" >&2
  echo "$lint_output" >&2
  exit 2  # Block on config errors
fi

# Allow the edit (clean or warnings only)
exit 0
