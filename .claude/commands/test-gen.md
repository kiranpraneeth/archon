Generate unit tests using the Test Generation Agent persona.

Load the agent context from .claude/agents/tester/CLAUDE.md and apply its test philosophy.

## Instructions

1. Read the source file to understand its exports, functions, and dependencies
2. Identify what needs to be tested:
   - All exported functions and classes
   - Public methods on classes
   - Edge cases and error conditions
3. Check if a test file already exists — if so, add missing tests rather than overwriting
4. Generate tests following the agent's output format (describe/it blocks with Vitest)
5. Place the test file alongside the source as `[filename].test.ts`
6. Mock external dependencies appropriately

## Usage Examples

- `/test-gen src/utils/validate.ts` — Generate tests for a utility file
- `/test-gen src/agents/reviewer/parser.ts` — Generate tests for a specific module
- `/test-gen src/core/config.ts` — Generate tests with mocked environment variables

## Arguments

$ARGUMENTS — Required: path to the source file to generate tests for

## Output

The agent will:
1. Analyze the source file structure
2. Generate a complete test file with:
   - Happy path tests for each exported function
   - Edge case tests (empty inputs, boundaries)
   - Error handling tests
   - Mocks for external dependencies
3. Write the test file to `[source-file].test.ts`
4. Provide a summary of what was tested and any areas needing human attention
