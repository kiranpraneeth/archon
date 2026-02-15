#!/bin/bash
#
# PostToolUse hook: Warn about undocumented exports in TypeScript files
#
# Checks for exported functions/types without JSDoc comments.
# Warns but does not block — this is advisory, not a gate.
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

# Skip test files — they don't need JSDoc
if [[ "$file_path" =~ \.test\.tsx?$ ]] || [[ "$file_path" =~ \.spec\.tsx?$ ]]; then
  exit 0
fi

# Find undocumented exports
# Strategy: Look for export lines not preceded by JSDoc (/**)
undocumented=()
prev_line=""
line_num=0

while IFS= read -r line; do
  ((line_num++))

  # Check if this line is an export declaration
  if [[ "$line" =~ ^export[[:space:]]+(function|const|type|interface|class)[[:space:]] ]]; then
    # Check if previous non-empty line ends with */
    if [[ ! "$prev_line" =~ \*\/[[:space:]]*$ ]]; then
      # Extract the export name
      name=$(echo "$line" | sed -E 's/^export[[:space:]]+(function|const|type|interface|class)[[:space:]]+([a-zA-Z_][a-zA-Z0-9_]*).*/\2/')
      undocumented+=("L${line_num}: ${name}")
    fi
  fi

  # Track previous non-empty line
  if [[ -n "${line// /}" ]]; then
    prev_line="$line"
  fi
done < "$file_path"

# Report if any undocumented exports found
if [[ ${#undocumented[@]} -gt 0 ]]; then
  echo "" >&2
  echo "📝 Documentation gap in $(basename "$file_path"):" >&2
  for item in "${undocumented[@]}"; do
    echo "   - $item (missing JSDoc)" >&2
  done
  echo "   Run '/docs $file_path' to generate documentation." >&2
  echo "" >&2
fi

# Always exit 0 — this is advisory, not a gate
exit 0
