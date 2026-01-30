#!/bin/bash
#
# PostToolUse hook: Run Prettier after editing TypeScript files
#
# Formats .ts/.tsx files automatically after Edit or Write operations
#

# Read JSON input from stdin
input=$(cat)

# Extract file path from tool input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a TypeScript file
if [[ -z "$file_path" ]] || [[ ! "$file_path" =~ \.tsx?$ ]]; then
  exit 0
fi

# Skip if file doesn't exist
if [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Check if prettier is available
if ! command -v npx &> /dev/null; then
  echo "npx not found, skipping formatting" >&2
  exit 0
fi

# Check if prettier is installed (locally or globally)
if ! npx prettier --version &> /dev/null 2>&1; then
  echo "Prettier not installed, skipping formatting" >&2
  exit 0
fi

# Run prettier on the file
prettier_output=$(npx prettier --write "$file_path" 2>&1)
prettier_exit_code=$?

if [[ $prettier_exit_code -ne 0 ]]; then
  echo "Prettier failed to format $file_path:" >&2
  echo "$prettier_output" >&2
  # Don't block - formatting failure shouldn't prevent the edit from completing
  exit 0
fi

# Success - file was formatted
exit 0
