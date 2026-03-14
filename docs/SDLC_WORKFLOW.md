# SDLC Workflow Guide

This guide explains how to use Archon's SDLC Orchestrator to coordinate the complete software development lifecycle.

## Overview

The SDLC Orchestrator manages the flow from requirements to deployed software:

```
┌──────────┐    ┌─────────────┐    ┌─────────┐    ┌────────┐    ┌────────────┐    ┌────────────┐
│ Planning │ -> │ Development │ -> │ Testing │ -> │ Review │ -> │ Deployment │ -> │ Monitoring │
└──────────┘    └─────────────┘    └─────────┘    └────────┘    └────────────┘    └────────────┘
   Planner         Developer         Tester       Reviewer        Deployer          Monitor
```

Each phase runs a specialized agent, collects artifacts, and passes context to the next phase.

## Quick Start

### Basic Usage

```bash
# Run complete SDLC from a PRD
/sdlc-run --prd docs/PRD_FEATURE.md

# Continue from a specific phase
/sdlc-run --from testing

# Skip phases (e.g., for hotfixes)
/sdlc-run --skip planning --skip review
```

### Workflow Commands

| Command | Description |
|---------|-------------|
| `/sdlc-run` | Start or continue the SDLC workflow |
| `/sdlc-run --status` | View current workflow state |
| `/sdlc-run --cancel` | Cancel the current workflow |

## Workflow Phases

### 1. Planning Phase

**Agent**: Planner
**Input**: PRD document
**Output**: Technical specification

The planner analyzes requirements and produces:
- Prioritized requirements (must-have, should-have, nice-to-have)
- Architecture decisions
- Technical tasks with complexity estimates
- Risk assessment

**Artifacts produced**:
- `technical_spec` - Complete technical specification

### 2. Development Phase

**Agent**: Developer
**Input**: Technical specification
**Output**: Generated code

The developer generates:
- Source files following project patterns
- Type definitions
- Initial test stubs

**Artifacts produced**:
- `code_changes` - List of files created/modified
- `generated_files` - The actual code files

### 3. Testing Phase

**Agent**: Tester
**Input**: Generated code
**Output**: Test reports

The tester:
- Generates comprehensive test cases
- Runs test suite
- Reports coverage metrics

**Artifacts produced**:
- `test_report` - Test results and coverage
- `test_files` - Generated test files

### 4. Review Phase

**Agent**: Reviewer
**Input**: Code + tests
**Output**: Review feedback

The reviewer:
- Analyzes code for issues
- Checks adherence to standards
- Identifies potential bugs

**Artifacts produced**:
- `review_report` - Review findings
- `review_decision` - Approve, request changes, or needs discussion

**Human Checkpoint**: By default, requires human approval before proceeding.

### 5. Deployment Phase

**Agent**: Deployer
**Input**: Reviewed code
**Output**: Build and deployment results

The deployer:
- Runs build pipeline
- Generates release notes
- Tags the release
- Deploys to target environment

**Artifacts produced**:
- `build_result` - Build status and artifacts
- `release_notes` - Generated changelog
- `deployment_result` - Deployment status

**Human Checkpoint**: By default, requires human approval for production.

### 6. Monitoring Phase

**Agent**: Monitor
**Input**: Deployed system
**Output**: Health and metrics reports

The monitor:
- Tracks deployment health
- Collects metrics
- Alerts on issues

**Artifacts produced**:
- `metrics_report` - System metrics
- `health_status` - Overall system health

## Human Checkpoints

### Default Checkpoints

| Phase | Checkpoint Required | Reason |
|-------|---------------------|--------|
| Planning | No | Low risk |
| Development | No | Reviewed later |
| Testing | No | Automated verification |
| Review | **Yes** | Code quality gate |
| Deployment | **Yes** | Production safety |
| Monitoring | No | Passive observation |

### Approving Checkpoints

When a checkpoint is reached:

```bash
# Approve and continue
/sdlc-run --approve

# Approve with comments
/sdlc-run --approve "Looks good, proceed"

# Reject and provide feedback
/sdlc-run --reject "Need more test coverage"
```

### Customizing Checkpoints

Edit the orchestrator configuration to change checkpoint behavior:

```typescript
const orchestrator = createOrchestrator({
  checkpointPhases: ['review', 'deployment'], // Which phases require approval
  autoApproveAfter: 24 * 60 * 60 * 1000,      // Auto-approve after 24h (optional)
});
```

## Failure Handling

### Automatic Retry

Transient failures (network issues, rate limits) are automatically retried:

```typescript
const orchestrator = createOrchestrator({
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
});
```

### Manual Recovery

For persistent failures:

```bash
# View failure details
/sdlc-run --status

# Retry current phase
/sdlc-run --retry

# Skip failed phase (if non-critical)
/sdlc-run --skip-current

# Rollback to previous phase
/sdlc-run --rollback
```

### Deployment Rollback

If deployment fails or issues are detected:

```bash
# Trigger rollback
/sdlc-run --rollback-deployment

# Rollback to specific version
/sdlc-run --rollback-to v1.2.3
```

## Workflow Customization

### Skipping Phases

For hotfixes or expedited workflows:

```bash
# Skip planning (emergency fix)
/sdlc-run --skip planning

# Skip review (pre-reviewed code)
/sdlc-run --skip review

# Multiple skips
/sdlc-run --skip planning --skip monitoring
```

### Starting from a Phase

Resume or start from a specific phase:

```bash
# Start from development (already planned)
/sdlc-run --from development

# Resume from failed phase
/sdlc-run --from testing
```

### Custom Workflows

#### TDD Workflow (Test-First)

```bash
# Generate tests first, then implementation
/sdlc-run --workflow tdd --prd docs/PRD_FEATURE.md
```

#### Hotfix Workflow

```bash
# Expedited: skip planning, minimal review
/sdlc-run --workflow hotfix --fix "Memory leak in cache"
```

## Agent Handoffs

### Context Passing

Each agent receives context from previous phases:

```typescript
type AgentMessage = {
  fromAgent: AgentName;     // Who sent it
  toAgent: AgentName;       // Who receives it
  phase: SDLCPhase;         // Current phase
  context: string;          // Human-readable summary
  artifacts: Artifact[];    // Data from previous phases
  metadata?: Record<string, unknown>;
};
```

### Artifact Types

| Type | Description | Produced By |
|------|-------------|-------------|
| `technical_spec` | Requirements and architecture | Planner |
| `code_changes` | File modifications | Developer |
| `generated_files` | New source files | Developer |
| `test_report` | Test results | Tester |
| `review_report` | Review findings | Reviewer |
| `build_result` | Build output | Deployer |
| `release_notes` | Changelog | Deployer |
| `deployment_result` | Deploy status | Deployer |
| `metrics_report` | System metrics | Monitor |

## Workflow State

### Viewing State

```bash
# Current status
/sdlc-run --status
```

Output:
```markdown
## Workflow Status

**ID**: wf-abc123
**Status**: in_progress
**Current Phase**: testing (attempt 2/10)

### Phase History
✅ planning (completed in 45s)
✅ development (completed in 2m 12s)
🔄 testing (in progress)
⏳ review (pending)
⏳ deployment (pending)
⏳ monitoring (pending)

### Artifacts Collected
- technical_spec (from planning)
- code_changes (from development)
- generated_files (from development)
```

### State Persistence

Workflow state is persisted to enable:
- Resuming after interruptions
- Auditing completed workflows
- Debugging failed workflows

## Best Practices

### 1. Always Start with a PRD

Well-defined requirements lead to better outcomes:
```bash
/sdlc-run --prd docs/PRD_WELL_DEFINED.md
```

### 2. Review Checkpoints Carefully

Don't auto-approve without inspection. Use the review checkpoint to:
- Verify code quality
- Check test coverage
- Validate architecture decisions

### 3. Use Appropriate Workflows

| Scenario | Recommended Workflow |
|----------|---------------------|
| New feature | Full SDLC |
| Bug fix | Skip planning |
| Security patch | Hotfix workflow |
| Refactoring | Skip deployment |

### 4. Monitor After Deployment

Always run the monitoring phase to catch issues early:
```bash
# Don't skip monitoring for production deploys
/sdlc-run --skip review  # OK for pre-reviewed
/sdlc-run --skip monitoring  # Not recommended for production
```

## Troubleshooting

### Common Issues

#### Workflow Stuck

```bash
# Check status
/sdlc-run --status

# Force retry
/sdlc-run --retry --force

# Cancel and restart
/sdlc-run --cancel
/sdlc-run --prd docs/PRD.md
```

#### Checkpoint Timeout

If approval is pending too long:
```bash
# View pending checkpoints
/sdlc-run --pending

# Approve with delay reason
/sdlc-run --approve "Delayed due to holiday"
```

#### Agent Failure

```bash
# View agent error
/sdlc-run --logs testing

# Skip problematic phase
/sdlc-run --skip testing

# Or provide manual input
/sdlc-run --continue --input test_report.json
```

## Configuration Reference

### Full Configuration

```typescript
type OrchestratorConfig = {
  // Workflow settings
  maxRetries: number;           // Default: 3
  retryDelay: number;           // Default: 5000ms
  maxIterations: number;        // Default: 10

  // Checkpoint settings
  checkpointPhases: SDLCPhase[]; // Default: ['review', 'deployment']
  autoApproveAfter?: number;     // Optional: auto-approve timeout

  // Phase settings
  skipPhases: SDLCPhase[];       // Phases to skip
  startPhase: SDLCPhase;         // Where to start

  // Agent settings
  agentTimeout: number;          // Default: 300000ms (5 min)
};
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARCHON_SDLC_MAX_RETRIES` | Max retry attempts | 3 |
| `ARCHON_SDLC_TIMEOUT` | Agent timeout | 300000 |
| `ARCHON_SDLC_AUTO_APPROVE` | Enable auto-approve | false |

## See Also

- [Agents Guide](./AGENTS.md) - Details on each agent
- [Architecture Guide](./ARCHITECTURE.md) - System design
- [SDLC Orchestration Pattern](../playbook/patterns/sdlc-orchestration.md) - Design rationale
