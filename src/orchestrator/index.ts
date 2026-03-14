/**
 * SDLC Orchestrator — Archon
 *
 * This orchestrator coordinates all SDLC agents through a workflow state machine.
 * It manages agent handoffs, context passing, human checkpoints, and failure recovery.
 *
 * The workflow follows the pattern:
 * IDLE → PLANNING → DEVELOPMENT → TESTING → REVIEW → DEPLOYMENT → MONITORING → IDLE
 *
 * @module orchestrator
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../core/types.js";

/**
 * SDLC workflow phases
 */
export const SDLCPhase = {
  IDLE: "idle",
  PLANNING: "planning",
  DEVELOPMENT: "development",
  TESTING: "testing",
  REVIEW: "review",
  DEPLOYMENT: "deployment",
  MONITORING: "monitoring",
} as const;

export type SDLCPhase = (typeof SDLCPhase)[keyof typeof SDLCPhase];

/**
 * Workflow execution status
 */
export const WorkflowStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  PAUSED: "paused",
  WAITING_APPROVAL: "waiting_approval",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type WorkflowStatus =
  (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

/**
 * Transition result status
 */
export const TransitionStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
  BLOCKED: "blocked",
  SKIPPED: "skipped",
} as const;

export type TransitionStatus =
  (typeof TransitionStatus)[keyof typeof TransitionStatus];

/**
 * Agent names in the SDLC workflow
 */
export const AgentName = {
  PLANNER: "planner",
  DEVELOPER: "developer",
  TESTER: "tester",
  REVIEWER: "reviewer",
  DEPLOYER: "deployer",
  MONITOR: "monitor",
} as const;

export type AgentName = (typeof AgentName)[keyof typeof AgentName];

/**
 * Artifact types produced by agents
 */
export const ArtifactType = {
  SPEC: "spec",
  CODE: "code",
  TEST: "test",
  DOC: "doc",
  REPORT: "report",
  BUILD: "build",
  RELEASE: "release",
} as const;

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

/**
 * Artifact produced by an agent during workflow execution
 */
export const ArtifactSchema = z.object({
  type: z.enum(["spec", "code", "test", "doc", "report", "build", "release"]),
  path: z.string(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  createdBy: z.enum([
    "planner",
    "developer",
    "tester",
    "reviewer",
    "deployer",
    "monitor",
  ]),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * Message passed between agents
 */
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.enum([
    "planner",
    "developer",
    "tester",
    "reviewer",
    "deployer",
    "monitor",
    "orchestrator",
  ]),
  to: z.enum([
    "planner",
    "developer",
    "tester",
    "reviewer",
    "deployer",
    "monitor",
    "orchestrator",
  ]),
  phase: z.enum([
    "idle",
    "planning",
    "development",
    "testing",
    "review",
    "deployment",
    "monitoring",
  ]),
  type: z.enum(["handoff", "request", "response", "error", "checkpoint"]),
  context: z.record(z.unknown()),
  artifacts: z.array(ArtifactSchema),
  timestamp: z.string(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Human checkpoint configuration
 */
export const CheckpointConfigSchema = z.object({
  phase: z.enum([
    "idle",
    "planning",
    "development",
    "testing",
    "review",
    "deployment",
    "monitoring",
  ]),
  required: z.boolean(),
  reason: z.string(),
  timeout: z.number().optional(),
  autoApproveAfter: z.number().optional(),
});

export type CheckpointConfig = z.infer<typeof CheckpointConfigSchema>;

/**
 * Human checkpoint approval record
 */
export const CheckpointApprovalSchema = z.object({
  phase: z.enum([
    "idle",
    "planning",
    "development",
    "testing",
    "review",
    "deployment",
    "monitoring",
  ]),
  approved: z.boolean(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  reason: z.string().optional(),
  conditions: z.array(z.string()).optional(),
});

export type CheckpointApproval = z.infer<typeof CheckpointApprovalSchema>;

/**
 * Phase execution result
 */
export const PhaseResultSchema = z.object({
  phase: z.enum([
    "idle",
    "planning",
    "development",
    "testing",
    "review",
    "deployment",
    "monitoring",
  ]),
  status: z.enum(["success", "failure", "blocked", "skipped"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  duration: z.number().optional(),
  artifacts: z.array(ArtifactSchema),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  metrics: z.record(z.number()).optional(),
  nextPhase: z
    .enum([
      "idle",
      "planning",
      "development",
      "testing",
      "review",
      "deployment",
      "monitoring",
    ])
    .optional(),
  requiresRetry: z.boolean().optional(),
  retryReason: z.string().optional(),
});

export type PhaseResult = z.infer<typeof PhaseResultSchema>;

/**
 * Workflow execution state
 */
export const WorkflowStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum([
    "not_started",
    "in_progress",
    "paused",
    "waiting_approval",
    "completed",
    "failed",
    "cancelled",
  ]),
  currentPhase: z.enum([
    "idle",
    "planning",
    "development",
    "testing",
    "review",
    "deployment",
    "monitoring",
  ]),
  phases: z.array(PhaseResultSchema),
  context: z.record(z.unknown()),
  artifacts: z.array(ArtifactSchema),
  checkpoints: z.array(CheckpointApprovalSchema),
  startedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  totalDuration: z.number().optional(),
  iteration: z.number(),
  maxIterations: z.number(),
  errors: z.array(z.string()),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

/**
 * Workflow execution summary
 */
export const WorkflowSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum([
    "not_started",
    "in_progress",
    "paused",
    "waiting_approval",
    "completed",
    "failed",
    "cancelled",
  ]),
  phasesCompleted: z.number(),
  totalPhases: z.number(),
  currentPhase: z.enum([
    "idle",
    "planning",
    "development",
    "testing",
    "review",
    "deployment",
    "monitoring",
  ]),
  artifactCount: z.number(),
  errorCount: z.number(),
  warningCount: z.number(),
  duration: z.number().optional(),
  iteration: z.number(),
  humanApprovalsPending: z.number(),
});

export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;

/**
 * Orchestrator configuration
 */
export type OrchestratorConfig = {
  /** Enable human checkpoints */
  enableCheckpoints: boolean;
  /** Phases requiring human approval */
  checkpointPhases: SDLCPhase[];
  /** Maximum workflow iterations (for retry loops) */
  maxIterations: number;
  /** Timeout per phase in milliseconds */
  phaseTimeout: number;
  /** Enable auto-recovery from transient failures */
  enableAutoRecovery: boolean;
  /** Maximum auto-recovery attempts per phase */
  maxRecoveryAttempts: number;
  /** Skip phases that are not needed */
  enablePhaseSkipping: boolean;
  /** Phases to skip */
  skipPhases: SDLCPhase[];
};

/** Default orchestrator configuration */
const DEFAULT_CONFIG: OrchestratorConfig = {
  enableCheckpoints: true,
  checkpointPhases: [SDLCPhase.REVIEW, SDLCPhase.DEPLOYMENT],
  maxIterations: 10,
  phaseTimeout: 300000, // 5 minutes
  enableAutoRecovery: true,
  maxRecoveryAttempts: 3,
  enablePhaseSkipping: true,
  skipPhases: [],
};

/**
 * Standard phase order for SDLC workflow
 */
const PHASE_ORDER: SDLCPhase[] = [
  SDLCPhase.IDLE,
  SDLCPhase.PLANNING,
  SDLCPhase.DEVELOPMENT,
  SDLCPhase.TESTING,
  SDLCPhase.REVIEW,
  SDLCPhase.DEPLOYMENT,
  SDLCPhase.MONITORING,
];

/**
 * Agent responsible for each phase
 */
const PHASE_AGENTS: Record<SDLCPhase, AgentName | null> = {
  [SDLCPhase.IDLE]: null,
  [SDLCPhase.PLANNING]: AgentName.PLANNER,
  [SDLCPhase.DEVELOPMENT]: AgentName.DEVELOPER,
  [SDLCPhase.TESTING]: AgentName.TESTER,
  [SDLCPhase.REVIEW]: AgentName.REVIEWER,
  [SDLCPhase.DEPLOYMENT]: AgentName.DEPLOYER,
  [SDLCPhase.MONITORING]: AgentName.MONITOR,
};

/**
 * SDLC Orchestrator Agent definition
 */
export type OrchestratorAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: OrchestratorConfig;
};

/**
 * Create an SDLC Orchestrator instance
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns A configured OrchestratorAgent instance
 *
 * @example
 * // Create with defaults
 * const orchestrator = createOrchestrator();
 *
 * @example
 * // Require human approval for all phases
 * const orchestrator = createOrchestrator({
 *   checkpointPhases: ['planning', 'development', 'testing', 'review', 'deployment']
 * });
 */
export function createOrchestrator(
  configOverrides: Partial<OrchestratorConfig> = {},
): OrchestratorAgent {
  const config: OrchestratorConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Orchestrator",
    role: "SDLC Workflow Orchestrator",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: true, // Manages workflow state files
      canExecuteCommands: true, // Coordinates agent execution
      canAccessNetwork: false, // No external network access
      requiresHumanApproval: true, // Major workflow decisions need approval
    },
    config,
  };
}

/**
 * Create an initial workflow state
 *
 * @param name - Name of the workflow
 * @param config - Orchestrator configuration
 * @param initialContext - Initial context data
 * @returns A new WorkflowState
 */
export function createWorkflowState(
  name: string,
  config: OrchestratorConfig,
  initialContext: Record<string, unknown> = {},
): WorkflowState {
  const now = new Date().toISOString();

  return {
    id: generateWorkflowId(),
    name,
    status: WorkflowStatus.NOT_STARTED,
    currentPhase: SDLCPhase.IDLE,
    phases: [],
    context: initialContext,
    artifacts: [],
    checkpoints: [],
    startedAt: now,
    updatedAt: now,
    iteration: 0,
    maxIterations: config.maxIterations,
    errors: [],
  };
}

/**
 * Generate a unique workflow ID
 */
function generateWorkflowId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `wf-${timestamp}-${random}`;
}

/**
 * Get the next phase in the workflow
 *
 * @param currentPhase - Current phase
 * @param config - Orchestrator configuration
 * @returns Next phase or null if at end
 */
export function getNextPhase(
  currentPhase: SDLCPhase,
  config: OrchestratorConfig,
): SDLCPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }

  // Find next non-skipped phase
  for (let i = currentIndex + 1; i < PHASE_ORDER.length; i++) {
    const nextPhase = PHASE_ORDER[i];

    if (nextPhase === undefined) {
      continue;
    }

    if (config.enablePhaseSkipping && config.skipPhases.includes(nextPhase)) {
      continue;
    }

    return nextPhase;
  }

  return null;
}

/**
 * Get the previous phase in the workflow (for retry loops)
 *
 * @param currentPhase - Current phase
 * @returns Previous phase or null if at start
 */
export function getPreviousPhase(currentPhase: SDLCPhase): SDLCPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  if (currentIndex <= 0) {
    return null;
  }

  return PHASE_ORDER[currentIndex - 1] ?? null;
}

/**
 * Get the agent responsible for a phase
 *
 * @param phase - SDLC phase
 * @returns Agent name or null for idle phase
 */
export function getPhaseAgent(phase: SDLCPhase): AgentName | null {
  return PHASE_AGENTS[phase];
}

/**
 * Check if a phase requires human approval
 *
 * @param phase - SDLC phase
 * @param config - Orchestrator configuration
 * @returns True if checkpoint required
 */
export function requiresCheckpoint(
  phase: SDLCPhase,
  config: OrchestratorConfig,
): boolean {
  return config.enableCheckpoints && config.checkpointPhases.includes(phase);
}

/**
 * Transition workflow to next phase
 *
 * @param state - Current workflow state
 * @param config - Orchestrator configuration
 * @param phaseResult - Result from current phase
 * @returns Updated workflow state
 */
export function transitionPhase(
  state: WorkflowState,
  config: OrchestratorConfig,
  phaseResult: PhaseResult,
): WorkflowState {
  const now = new Date().toISOString();

  // Add phase result to history
  const updatedPhases = [...state.phases, phaseResult];

  // Determine next phase based on result
  let nextPhase: SDLCPhase;
  let nextStatus: WorkflowStatus;

  if (phaseResult.status === TransitionStatus.FAILURE) {
    // Check if we should retry
    if (phaseResult.requiresRetry && state.iteration < state.maxIterations) {
      // Go back to development phase for fixes
      nextPhase =
        phaseResult.nextPhase ??
        getPreviousPhase(state.currentPhase) ??
        state.currentPhase;
      nextStatus = WorkflowStatus.IN_PROGRESS;
    } else {
      // Workflow failed
      nextPhase = state.currentPhase;
      nextStatus = WorkflowStatus.FAILED;
    }
  } else if (phaseResult.status === TransitionStatus.BLOCKED) {
    // Waiting for human approval
    nextPhase = state.currentPhase;
    nextStatus = WorkflowStatus.WAITING_APPROVAL;
  } else {
    // Success or skipped - move to next phase
    const calculatedNextPhase = getNextPhase(state.currentPhase, config);

    if (calculatedNextPhase === null) {
      // Workflow completed
      nextPhase = SDLCPhase.IDLE;
      nextStatus = WorkflowStatus.COMPLETED;
    } else {
      nextPhase = calculatedNextPhase;

      // Check if next phase needs approval
      if (requiresCheckpoint(calculatedNextPhase, config)) {
        nextStatus = WorkflowStatus.WAITING_APPROVAL;
      } else {
        nextStatus = WorkflowStatus.IN_PROGRESS;
      }
    }
  }

  // Calculate iteration increment
  const iteration =
    phaseResult.requiresRetry && phaseResult.status === TransitionStatus.SUCCESS
      ? state.iteration + 1
      : state.iteration;

  // Merge artifacts
  const artifacts = [...state.artifacts, ...phaseResult.artifacts];

  // Add errors
  const errors = [...state.errors, ...phaseResult.errors];

  return {
    ...state,
    status: nextStatus,
    currentPhase: nextPhase,
    phases: updatedPhases,
    artifacts,
    errors,
    updatedAt: now,
    completedAt:
      nextStatus === WorkflowStatus.COMPLETED ||
      nextStatus === WorkflowStatus.FAILED
        ? now
        : undefined,
    iteration,
  };
}

/**
 * Apply human checkpoint approval to workflow
 *
 * @param state - Current workflow state
 * @param approval - Checkpoint approval
 * @returns Updated workflow state
 */
export function applyCheckpointApproval(
  state: WorkflowState,
  approval: CheckpointApproval,
): WorkflowState {
  const now = new Date().toISOString();

  const updatedCheckpoints = [...state.checkpoints, approval];

  if (approval.approved) {
    return {
      ...state,
      status: WorkflowStatus.IN_PROGRESS,
      checkpoints: updatedCheckpoints,
      updatedAt: now,
    };
  } else {
    return {
      ...state,
      status: WorkflowStatus.PAUSED,
      checkpoints: updatedCheckpoints,
      updatedAt: now,
      errors: [...state.errors, approval.reason ?? "Checkpoint rejected"],
    };
  }
}

/**
 * Create a workflow summary from state
 *
 * @param state - Workflow state
 * @returns Workflow summary
 */
export function getWorkflowSummary(state: WorkflowState): WorkflowSummary {
  const completedPhases = state.phases.filter(
    (p) =>
      p.status === TransitionStatus.SUCCESS ||
      p.status === TransitionStatus.SKIPPED,
  );

  const errorCount = state.phases.reduce((sum, p) => sum + p.errors.length, 0);
  const warningCount = state.phases.reduce(
    (sum, p) => sum + p.warnings.length,
    0,
  );

  const pendingApprovals = state.status === WorkflowStatus.WAITING_APPROVAL;

  // Calculate duration
  const startTime = new Date(state.startedAt).getTime();
  const endTime = state.completedAt
    ? new Date(state.completedAt).getTime()
    : Date.now();
  const duration = endTime - startTime;

  return {
    id: state.id,
    name: state.name,
    status: state.status,
    phasesCompleted: completedPhases.length,
    totalPhases: PHASE_ORDER.length - 2, // Exclude IDLE and MONITORING as terminal
    currentPhase: state.currentPhase,
    artifactCount: state.artifacts.length,
    errorCount,
    warningCount,
    duration,
    iteration: state.iteration,
    humanApprovalsPending: pendingApprovals ? 1 : 0,
  };
}

/**
 * Create an agent handoff message
 *
 * @param from - Source agent
 * @param to - Target agent
 * @param phase - Current phase
 * @param context - Context to pass
 * @param artifacts - Artifacts to pass
 * @returns Agent message
 */
export function createHandoffMessage(
  from: AgentMessage["from"],
  to: AgentMessage["to"],
  phase: SDLCPhase,
  context: Record<string, unknown>,
  artifacts: Artifact[],
): AgentMessage {
  return {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    from,
    to,
    phase,
    type: "handoff",
    context,
    artifacts,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format workflow state as markdown report
 *
 * @param state - Workflow state
 * @returns Markdown-formatted report
 */
export function formatWorkflowReport(state: WorkflowState): string {
  const summary = getWorkflowSummary(state);
  const lines: string[] = [];

  lines.push(`# Workflow Report: ${state.name}`);
  lines.push("");
  lines.push(`**ID:** ${state.id}`);
  lines.push(`**Status:** ${getStatusIcon(state.status)} ${state.status}`);
  lines.push(
    `**Current Phase:** ${getPhaseIcon(state.currentPhase)} ${state.currentPhase}`,
  );
  lines.push(
    `**Progress:** ${summary.phasesCompleted}/${summary.totalPhases} phases`,
  );
  lines.push(`**Iteration:** ${state.iteration}/${state.maxIterations}`);
  lines.push("");

  // Duration
  if (summary.duration) {
    lines.push(`**Duration:** ${formatDuration(summary.duration)}`);
    lines.push("");
  }

  // Phase history
  if (state.phases.length > 0) {
    lines.push("## Phase History");
    lines.push("");
    lines.push("| Phase | Status | Duration | Artifacts | Errors |");
    lines.push("|-------|--------|----------|-----------|--------|");

    for (const phase of state.phases) {
      const phaseIcon = getPhaseIcon(phase.phase);
      const statusIcon = getTransitionStatusIcon(phase.status);
      const duration = phase.duration ? formatDuration(phase.duration) : "-";
      lines.push(
        `| ${phaseIcon} ${phase.phase} | ${statusIcon} ${phase.status} | ${duration} | ${phase.artifacts.length} | ${phase.errors.length} |`,
      );
    }
    lines.push("");
  }

  // Artifacts
  if (state.artifacts.length > 0) {
    lines.push("## Artifacts");
    lines.push("");
    for (const artifact of state.artifacts) {
      const typeIcon = getArtifactTypeIcon(artifact.type);
      lines.push(
        `- ${typeIcon} **${artifact.type}**: \`${artifact.path}\` (by ${artifact.createdBy})`,
      );
    }
    lines.push("");
  }

  // Checkpoints
  if (state.checkpoints.length > 0) {
    lines.push("## Human Checkpoints");
    lines.push("");
    for (const checkpoint of state.checkpoints) {
      const icon = checkpoint.approved ? "✅" : "❌";
      lines.push(
        `- ${icon} **${checkpoint.phase}**: ${checkpoint.approved ? "Approved" : "Rejected"}`,
      );
      if (checkpoint.approvedBy) {
        lines.push(`  - By: ${checkpoint.approvedBy}`);
      }
      if (checkpoint.reason) {
        lines.push(`  - Reason: ${checkpoint.reason}`);
      }
    }
    lines.push("");
  }

  // Errors
  if (state.errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const error of state.errors) {
      lines.push(`- ❌ ${error}`);
    }
    lines.push("");
  }

  // Summary statistics
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Artifacts Created:** ${summary.artifactCount}`);
  lines.push(`- **Errors:** ${summary.errorCount}`);
  lines.push(`- **Warnings:** ${summary.warningCount}`);
  if (summary.humanApprovalsPending > 0) {
    lines.push(
      `- **⏳ Human Approvals Pending:** ${summary.humanApprovalsPending}`,
    );
  }

  return lines.join("\n");
}

/**
 * Get status icon
 */
function getStatusIcon(status: WorkflowStatus): string {
  switch (status) {
    case WorkflowStatus.NOT_STARTED:
      return "⚪";
    case WorkflowStatus.IN_PROGRESS:
      return "🔄";
    case WorkflowStatus.PAUSED:
      return "⏸️";
    case WorkflowStatus.WAITING_APPROVAL:
      return "⏳";
    case WorkflowStatus.COMPLETED:
      return "✅";
    case WorkflowStatus.FAILED:
      return "❌";
    case WorkflowStatus.CANCELLED:
      return "🚫";
    default:
      return "•";
  }
}

/**
 * Get phase icon
 */
function getPhaseIcon(phase: SDLCPhase): string {
  switch (phase) {
    case SDLCPhase.IDLE:
      return "💤";
    case SDLCPhase.PLANNING:
      return "📋";
    case SDLCPhase.DEVELOPMENT:
      return "💻";
    case SDLCPhase.TESTING:
      return "🧪";
    case SDLCPhase.REVIEW:
      return "👀";
    case SDLCPhase.DEPLOYMENT:
      return "🚀";
    case SDLCPhase.MONITORING:
      return "📊";
    default:
      return "•";
  }
}

/**
 * Get transition status icon
 */
function getTransitionStatusIcon(status: TransitionStatus): string {
  switch (status) {
    case TransitionStatus.SUCCESS:
      return "✅";
    case TransitionStatus.FAILURE:
      return "❌";
    case TransitionStatus.BLOCKED:
      return "⏳";
    case TransitionStatus.SKIPPED:
      return "⏭️";
    default:
      return "•";
  }
}

/**
 * Get artifact type icon
 */
function getArtifactTypeIcon(type: ArtifactType): string {
  switch (type) {
    case ArtifactType.SPEC:
      return "📄";
    case ArtifactType.CODE:
      return "💻";
    case ArtifactType.TEST:
      return "🧪";
    case ArtifactType.DOC:
      return "📝";
    case ArtifactType.REPORT:
      return "📊";
    case ArtifactType.BUILD:
      return "📦";
    case ArtifactType.RELEASE:
      return "🏷️";
    default:
      return "📁";
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
