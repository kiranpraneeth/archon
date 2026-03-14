# Pattern: SDLC Orchestration

> Coordinating multiple AI agents through a complete software development lifecycle

## Problem

You have multiple specialized agents (planner, developer, tester, reviewer, deployer, monitor), but they work in isolation. You need:

- Agents to work together in sequence
- Context and artifacts to flow between phases
- Human checkpoints at critical decision points
- Failure handling and recovery
- State persistence across sessions

## Solution

Implement a **workflow orchestrator** that manages the SDLC as a state machine with agent handoffs.

### The State Machine

```
         ┌──────────────────────────────────────────────────────────────────┐
         │                                                                  │
         ▼                                                                  │
     ┌───────┐    ┌──────────┐    ┌─────────────┐    ┌─────────┐           │
     │ idle  │───>│ planning │───>│ development │───>│ testing │           │
     └───────┘    └──────────┘    └─────────────┘    └─────────┘           │
         ▲                                                │                 │
         │                                                ▼                 │
         │        ┌────────────┐    ┌────────────┐    ┌────────┐           │
         └────────│ monitoring │<───│ deployment │<───│ review │           │
                  └────────────┘    └────────────┘    └────────┘           │
                        │                 │                                │
                        │                 └────────────────────────────────┘
                        │                       (on failure/rollback)
                        ▼
                    [complete]
```

### Core Concepts

#### 1. Workflow State

Track the entire workflow in a single, serializable state object:

```typescript
type WorkflowState = {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'paused';
  currentPhase: SDLCPhase;
  phaseResults: Map<SDLCPhase, PhaseResult>;
  artifacts: Artifact[];
  startedAt: Date;
  completedAt?: Date;
  currentIteration: number;
  maxIterations: number;
};
```

#### 2. Phase Transitions

Each transition:
1. Validates preconditions
2. Runs the responsible agent
3. Collects artifacts
4. Checks for human checkpoint
5. Advances to next phase or handles failure

```typescript
function transitionPhase(state: WorkflowState, result: PhaseResult): WorkflowState {
  // Record result
  const updated = {
    ...state,
    phaseResults: new Map(state.phaseResults).set(state.currentPhase, result),
    artifacts: [...state.artifacts, ...result.artifacts],
  };

  if (result.status === 'failed') {
    // Retry logic
    if (updated.currentIteration < updated.maxIterations) {
      return { ...updated, currentIteration: updated.currentIteration + 1 };
    }
    return { ...updated, status: 'failed' };
  }

  // Check for checkpoint
  if (requiresCheckpoint(state.currentPhase)) {
    return { ...updated, status: 'paused' };
  }

  // Advance to next phase
  const nextPhase = getNextPhase(state.currentPhase);
  if (!nextPhase) {
    return { ...updated, status: 'completed', completedAt: new Date() };
  }

  return { ...updated, currentPhase: nextPhase, currentIteration: 0 };
}
```

#### 3. Agent Handoffs

Pass context between agents via structured messages:

```typescript
type AgentMessage = {
  fromAgent: AgentName;
  toAgent: AgentName;
  phase: SDLCPhase;
  context: string;           // Human-readable summary
  artifacts: Artifact[];     // Structured data
  metadata?: Record<string, unknown>;
};

function createHandoffMessage(
  fromPhase: SDLCPhase,
  toPhase: SDLCPhase,
  context: string,
  artifacts: Artifact[]
): AgentMessage {
  return {
    fromAgent: getPhaseAgent(fromPhase),
    toAgent: getPhaseAgent(toPhase),
    phase: toPhase,
    context,
    artifacts,
  };
}
```

#### 4. Human Checkpoints

Pause workflow for human approval at critical points:

```typescript
const DEFAULT_CHECKPOINTS: SDLCPhase[] = ['review', 'deployment'];

function requiresCheckpoint(phase: SDLCPhase, config: OrchestratorConfig): boolean {
  return config.checkpointPhases.includes(phase);
}

function applyCheckpointApproval(
  state: WorkflowState,
  approval: CheckpointApproval
): WorkflowState {
  if (!approval.approved) {
    // Rejection: go back to previous phase
    return {
      ...state,
      status: 'in_progress',
      currentPhase: getPreviousPhase(state.currentPhase) ?? state.currentPhase,
    };
  }

  // Approval: continue to next phase
  const nextPhase = getNextPhase(state.currentPhase);
  return {
    ...state,
    status: nextPhase ? 'in_progress' : 'completed',
    currentPhase: nextPhase ?? state.currentPhase,
  };
}
```

### Phase-Agent Mapping

| Phase | Agent | Input | Output |
|-------|-------|-------|--------|
| planning | Planner | PRD | Technical Spec |
| development | Developer | Spec | Code Changes |
| testing | Tester | Code | Test Report |
| review | Reviewer | Code + Tests | Review Report |
| deployment | Deployer | Reviewed Code | Build + Deploy |
| monitoring | Monitor | Deployed System | Metrics |

### Failure Strategies

#### Retry with Backoff

```typescript
async function runPhaseWithRetry(
  phase: SDLCPhase,
  state: WorkflowState,
  config: OrchestratorConfig
): Promise<PhaseResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await runPhase(phase, state);
    } catch (error) {
      lastError = error as Error;
      await sleep(config.retryDelay * Math.pow(2, attempt));
    }
  }

  return {
    phase,
    status: 'failed',
    error: lastError?.message,
    artifacts: [],
  };
}
```

#### Rollback on Deployment Failure

```typescript
function handleDeploymentFailure(state: WorkflowState): WorkflowState {
  const deployResult = state.phaseResults.get('deployment');

  if (deployResult?.rollbackAvailable) {
    // Trigger rollback
    return {
      ...state,
      currentPhase: 'deployment',
      currentIteration: 0,
      metadata: { ...state.metadata, isRollback: true },
    };
  }

  // No rollback available, fail workflow
  return { ...state, status: 'failed' };
}
```

## Implementation

### Orchestrator Factory

```typescript
function createOrchestrator(config: Partial<OrchestratorConfig> = {}) {
  const fullConfig: OrchestratorConfig = {
    maxRetries: config.maxRetries ?? 3,
    maxIterations: config.maxIterations ?? 10,
    checkpointPhases: config.checkpointPhases ?? ['review', 'deployment'],
    skipPhases: config.skipPhases ?? [],
    ...config,
  };

  return {
    config: fullConfig,
    createWorkflowState,
    transitionPhase: (state, result) => transitionPhase(state, result, fullConfig),
    requiresCheckpoint: (phase) => requiresCheckpoint(phase, fullConfig),
    getNextPhase,
    getPreviousPhase,
    getPhaseAgent,
  };
}
```

### Usage Example

```typescript
const orchestrator = createOrchestrator({
  checkpointPhases: ['deployment'], // Only checkpoint at deployment
  skipPhases: ['monitoring'],       // Skip monitoring for this workflow
});

// Initialize workflow
let state = orchestrator.createWorkflowState('prd-123');

// Run through phases
while (state.status === 'in_progress') {
  const result = await runPhase(state.currentPhase, state);
  state = orchestrator.transitionPhase(state, result);

  if (state.status === 'paused') {
    // Wait for human approval
    const approval = await waitForApproval(state);
    state = applyCheckpointApproval(state, approval);
  }
}

console.log(`Workflow ${state.status}:`, getWorkflowSummary(state));
```

## Trade-offs

### Pros

- **Structured workflow**: Clear progression through phases
- **Recoverable**: State persistence enables resume after failures
- **Auditable**: Full history of what each agent produced
- **Safe**: Human checkpoints prevent automated mistakes

### Cons

- **Complexity**: More moving parts than running agents directly
- **Latency**: Sequential execution adds time
- **Rigidity**: Fixed phases may not suit all workflows

### When to Use

Use SDLC orchestration when:
- Building features with multiple stages (design, code, test, deploy)
- Human oversight is required at specific points
- You need audit trails of agent decisions
- Recovery from failures is important

Don't use when:
- Running a single agent task
- Speed is more important than safety
- The workflow is highly custom

## Variations

### Parallel Phases

Some phases can run in parallel:

```
planning -> [development, testing] -> review -> deployment -> monitoring
```

### Feedback Loops

Allow review feedback to trigger re-development:

```
development <-> testing <-> review
```

### Configurable Entry Points

Start from any phase for partial workflows:

```typescript
const state = createWorkflowState('hotfix-123', {
  startPhase: 'development', // Skip planning
});
```

## Related Patterns

- [Subagent Orchestration](./subagent-orchestration.md) - Simpler two-agent workflows
- [Human Checkpoints](./human-checkpoints.md) - Designing approval gates
- [Autonomous Agents](./autonomous-agents.md) - Running without human oversight

## References

- [SDLC Workflow Guide](../docs/SDLC_WORKFLOW.md)
- [Orchestrator Implementation](../src/orchestrator/index.ts)
