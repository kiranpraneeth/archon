Manage documentation using the Documentation Agent persona.

Load the agent context from .claude/agents/documenter/CLAUDE.md and apply its documentation philosophy.

## Instructions

Determine the mode based on arguments:

### Mode 1: Generate/Update (file path provided)
1. Read the source file
2. Check for existing JSDoc comments
3. Generate or update documentation:
   - Add missing JSDoc for exported functions
   - Update outdated parameter descriptions
   - Add usage examples for non-obvious APIs
4. Follow the output standards from the agent context
5. Do NOT delete existing documentation — only add or update

### Mode 2: Audit (--audit flag or no args)
1. Scan the target directory (or changed files if no path)
2. Identify:
   - Exported functions missing JSDoc
   - Outdated documentation (params don't match signature)
   - Missing README sections
3. Output audit report in the format defined in agent context
4. Prioritize by visibility (public APIs first)

### Mode 3: Smart (no args, in git context)
1. Check `git diff --staged` or recent changes
2. For changed files, check if documentation needs updating
3. Suggest specific documentation updates needed
4. Do NOT auto-generate — show what's needed and ask for confirmation

## Usage Examples

- `/docs src/core/types.ts` — Generate JSDoc for exports in this file
- `/docs src/agents/` — Document all files in directory
- `/docs --audit` — Full documentation audit
- `/docs --audit src/core/` — Audit specific directory
- `/docs` — Smart mode: check what docs need updating

## Arguments

$ARGUMENTS — Optional: file/directory path, or --audit flag. Defaults to smart mode on changed files.

## Output

Depending on mode:
- **Generate**: Updated file with JSDoc comments
- **Audit**: Report showing documented/undocumented/outdated items
- **Smart**: Summary of what needs documentation attention

Always respect the agent's limitations — flag tutorials and architecture docs for human writing.
