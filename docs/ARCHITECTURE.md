# Architecture Guide

This guide explains Archon's structure and how to extend it.

## Project Structure

```
archon/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Entry point
│   ├── core/                     # Shared types and schemas
│   │   ├── types.ts              # Agent, ReviewResult, FeedbackItem
│   │   └── index.ts              # Re-exports
│   ├── agents/                   # Agent implementations
│   │   └── reviewer/             # Code Review Agent
│   │       ├── index.ts          # createReviewAgent(), formatReviewAsMarkdown()
│   │       └── README.md         # Agent documentation
│   └── memory/                   # Pluggable memory system
│       ├── types.ts              # MemoryEntry, MemoryProvider
│       └── index.ts              # createMemoryProvider()
│
├── .claude/                      # Claude Code configuration
│   ├── agents/                   # Agent personas
│   │   ├── reviewer/CLAUDE.md    # Code Review Agent context
│   │   ├── tester/CLAUDE.md      # Test Generation Agent context
│   │   └── documenter/CLAUDE.md  # Documentation Agent context
│   ├── commands/                 # Slash command definitions
│   │   ├── review.md             # /review command
│   │   ├── test-gen.md           # /test-gen command
│   │   ├── docs.md               # /docs command
│   │   └── review-with-tests.md  # /review-with-tests command
│   ├── hooks/                    # Quality gate scripts
│   │   ├── lint-typescript.sh
│   │   ├── format-typescript.sh
│   │   ├── docs-check.sh
│   │   └── test-coverage-check.sh
│   └── settings.json             # Hook configuration
│
├── .github/workflows/            # GitHub Actions
│   └── code-review.yml           # Automated PR review
│
├── playbook/                     # Agentic Engineering Playbook
│   ├── patterns/                 # Reusable patterns
│   └── insights/                 # Lessons learned
│
└── docs/                         # Documentation
```

## How Agents Work

### The Agent Stack

```
┌─────────────────────────────────────────┐
│           Claude Code CLI               │
│  (Provides Claude, tools, permissions)  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Agent Context (CLAUDE.md)       │
│  (Identity, responsibilities, output)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Command (commands/*.md)         │
│  (How to invoke, arguments, workflow)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      TypeScript (src/agents/*)          │
│  (Types, utilities, formatting)         │
└─────────────────────────────────────────┘
```

### Agent Context Files

Each agent has a `CLAUDE.md` defining:

```markdown
# Agent Name — Archon

## Identity
Who the agent is and its role.

## Responsibilities
1. What it does
2. What it doesn't do

## Philosophy
How it approaches tasks.

## Output Format
Expected structure of responses.

## Limitations
What it cannot do.

## Escalation Triggers
When to involve humans.
```

### Command Files

Commands define how to invoke an agent:

```markdown
Description of what the command does.

## Instructions
Step-by-step workflow.

## Arguments
$ARGUMENTS — Description of inputs.

## Output
What the command produces.
```

## Core Types

### Agent Interface

```typescript
type Agent = {
  readonly name: string;        // "Reviewer"
  readonly role: string;        // "Code Review Agent"
  readonly status: "active" | "planned" | "deprecated";
  readonly version: string;     // "0.1.0"
};
```

### Agent Capabilities

```typescript
type AgentCapabilities = {
  canModifyFiles: boolean;      // Can write/edit files?
  canExecuteCommands: boolean;  // Can run shell commands?
  canAccessNetwork: boolean;    // Can make HTTP requests?
  requiresHumanApproval: boolean; // Needs confirmation?
};
```

### Review Output

```typescript
type ReviewResult = {
  summary: "approve" | "request_changes" | "needs_discussion";
  overview: string;
  feedback: FeedbackItem[];
  positives: string[];
  questions: string[];
  requiresHumanReview: boolean;
  humanReviewReason?: string;
};

type FeedbackItem = {
  severity: "blocker" | "suggestion" | "nitpick";
  file: string;
  line?: number;
  message: string;
  explanation?: string;
  suggestedFix?: string;
};
```

## Memory System

### Provider Interface

```typescript
type MemoryProvider = {
  save(input: MemoryInput): Promise<MemoryEntry>;
  search(query: string, options?: MemorySearchOptions): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | null>;
  list(options?: MemorySearchOptions): Promise<MemoryEntry[]>;
  delete(id: string): Promise<void>;
  readonly name: string;
};
```

### Built-in Providers

| Provider | Config | Use Case |
|----------|--------|----------|
| `file` | `{ type: "file", path: ".claude/memory" }` | Development, single machine |
| `mcp` | `{ type: "mcp", serverName: "memory" }` | Claude Code runtime |
| `custom` | `{ type: "custom", provider: myProvider }` | Bring your own |

### Usage

```typescript
import { createMemoryProvider } from "./memory";

const memory = createMemoryProvider({
  type: "file",
  path: ".claude/memory",
});

await memory.save({
  content: "User prefers conventional commits",
  tags: ["preference", "git"],
});

const results = await memory.search("commits");
```

### Adding Custom Providers

```typescript
import { registerMemoryProvider, MemoryProvider } from "./memory";

class RedisMemoryProvider implements MemoryProvider {
  // Implement all methods
}

registerMemoryProvider("redis", (config) => new RedisMemoryProvider(config));

// Now you can use it
const memory = createMemoryProvider({ type: "redis", url: "..." });
```

## Extending Archon

### Adding a New Agent

1. **Create context file**: `.claude/agents/{name}/CLAUDE.md`
   ```markdown
   # {Name} Agent — Archon

   ## Identity
   ...
   ```

2. **Create command file**: `.claude/commands/{name}.md`
   ```markdown
   Description of the command.

   ## Instructions
   ...
   ```

3. **Optionally add TypeScript**: `src/agents/{name}/`
   - Types for agent output
   - Utility functions
   - Formatting helpers

### Adding a New Hook

1. **Create script**: `.claude/hooks/{name}.sh`
   ```bash
   #!/bin/bash
   input=$(cat)
   file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
   # Your logic
   exit 0
   ```

2. **Make executable**: `chmod +x .claude/hooks/{name}.sh`

3. **Register in settings**: `.claude/settings.json`
   ```json
   {
     "hooks": {
       "PostToolUse": [{
         "matcher": "Edit|Write",
         "hooks": [{ "command": ".claude/hooks/{name}.sh" }]
       }]
     }
   }
   ```

### Adding a GitHub Action

1. **Create workflow**: `.github/workflows/{name}.yml`
2. **Use Claude Code action** or `npx @anthropic-ai/claude-code`
3. **Provide headless prompt** — agents can't ask questions in CI

See [Autonomous Agents Pattern](../playbook/patterns/autonomous-agents.md).

## Design Principles

### Agents as Specialized Team Members

Each agent has:
- **Narrow scope** — One job, done well
- **Clear boundaries** — What it can and cannot do
- **Human oversight** — Checkpoints for consequential actions
- **Transparent reasoning** — Output explains itself

### Composition Over Inheritance

Agents are composed, not inherited:
- Orchestrator commands combine agents
- Memory is pluggable
- Hooks are independent

### Convention Over Configuration

Sensible defaults with escape hatches:
- Hooks run automatically (disable if needed)
- Agents have default behavior (customize via CLAUDE.md)
- Memory defaults to file provider (swap for production)

## Testing

### Running Tests

```bash
npm run test:run          # Run all tests
npm run test              # Watch mode
npm run test:run -- src/memory/  # Specific directory
```

### Test Structure

Tests live alongside source files:
```
src/core/types.ts       → src/core/index.test.ts
src/memory/index.ts     → src/memory/index.test.ts
```

### Test Philosophy

- Test behavior, not implementation
- One logical assertion per test
- Readable test names: `should [verb] [outcome] when [condition]`
