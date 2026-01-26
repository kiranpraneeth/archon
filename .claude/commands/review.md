Review the code changes using the Code Review Agent persona.

Load the agent context from .claude/agents/reviewer/CLAUDE.md and apply its review philosophy.

## Instructions

1. First, identify what files have changed (if in a git context, use `git diff` or `git diff --staged`)
2. For each changed file, perform a review following the agent's checklist
3. Output the review in the structured format defined in the agent context
4. Categorize all feedback as 🔴 Blocker, 🟡 Suggestion, or 🟢 Nitpick
5. Always include a "What I Liked" section to maintain constructive tone
6. If you identify security concerns or architecture changes, explicitly note that human review is required

## Usage Examples

- `/review` — Review staged changes
- `/review src/agents/` — Review specific directory
- `/review --pr` — Review as if preparing PR feedback

## Arguments

$ARGUMENTS — Optional: specific files or directories to review, or flags like --staged, --pr
