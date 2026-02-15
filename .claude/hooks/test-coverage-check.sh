#!/bin/bash
#
# PostToolUse hook: Warn about missing test files
#
# Checks if edited source files have corresponding test files.
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

# Skip test files themselves
if [[ "$file_path" =~ \.test\.tsx?$ ]] || [[ "$file_path" =~ \.spec\.tsx?$ ]]; then
  exit 0
fi

# Skip type definition files (mostly types, not much to test)
if [[ "$file_path" =~ \.d\.ts$ ]]; then
  exit 0
fi

# Skip index files that are just re-exports
filename=$(basename "$file_path")
if [[ "$filename" == "index.ts" ]] || [[ "$filename" == "index.tsx" ]]; then
  # Check if it's just exports (less than 10 lines of actual code)
  if [[ -f "$file_path" ]]; then
    code_lines=$(grep -v "^export" "$file_path" | grep -v "^import" | grep -v "^//" | grep -v "^\s*\*" | grep -v "^$" | wc -l)
    if [[ $code_lines -lt 10 ]]; then
      exit 0
    fi
  fi
fi

# Skip if file doesn't exist (might be a delete operation)
if [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Construct expected test file path
dir=$(dirname "$file_path")
base=$(basename "$file_path" .ts)
base=$(basename "$base" .tsx)
test_file="${dir}/${base}.test.ts"
test_file_tsx="${dir}/${base}.test.tsx"

# Check if test file exists
if [[ ! -f "$test_file" ]] && [[ ! -f "$test_file_tsx" ]]; then
  echo "" >&2
  echo "🧪 Missing test file for $(basename "$file_path"):" >&2
  echo "   Expected: ${base}.test.ts" >&2
  echo "   Run '/test-gen $file_path' to generate tests." >&2
  echo "" >&2
fi

# Always exit 0 — this is advisory, not a gate
exit 0
