Generate a technical specification from a PRD using the Planning Agent persona.

Load the agent context from .claude/agents/planner/CLAUDE.md and apply its planning philosophy.

## Instructions

1. Read the PRD document to understand requirements, constraints, and goals
2. Explore the existing codebase to understand:
   - Current file organization patterns
   - Type definitions and schemas in use
   - Testing conventions
   - Integration points with other modules
3. Extract requirements and categorize by priority (must-have, should-have, nice-to-have)
4. Design architecture that:
   - Follows existing patterns
   - Minimizes changes to working code
   - Supports the required functionality
5. Break down implementation into ordered tasks with:
   - Clear acceptance criteria
   - Dependency relationships
   - Complexity estimates
6. Identify technical risks with severity and mitigation strategies
7. Surface open questions that need human input before development

## Usage Examples

- `/plan docs/PRD_FEATURE_X.md` — Generate tech spec from a PRD file
- `/plan "Add user authentication with OAuth"` — Generate tech spec from description
- `/plan --output plans/spec-auth.md docs/auth-prd.md` — Write spec to specific file

## Arguments

$ARGUMENTS — Required: path to PRD file or feature description in quotes

## Output

The agent will produce a technical specification including:
1. **Summary**: Overview of what will be built
2. **Requirements**: Categorized list of functional and non-functional requirements
3. **Architecture**: File structure, data flow, integration points
4. **Implementation Tasks**: Ordered list with acceptance criteria
5. **Technical Risks**: Severity-ranked risks with mitigations
6. **Dependencies**: Required and optional external dependencies
7. **Open Questions**: Items needing human clarification

## Options

- `--output <path>`: Write specification to a specific file
- `--format json`: Output as JSON instead of markdown
- `--tasks-only`: Only output the task breakdown (skip architecture)
- `--risks-only`: Only output risk assessment

## Notes

- The agent will flag when human review is required
- Complex architectural decisions are surfaced as open questions
- Task complexity estimates are relative, not absolute time
- The specification should be reviewed before development starts
