/**
 * SDLC Workflow Integration Tests
 *
 * These tests verify the complete SDLC workflow orchestration,
 * including phase transitions, agent handoffs, and checkpoint handling.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrchestrator,
  createWorkflowState,
  getNextPhase,
  getPreviousPhase,
  getPhaseAgent,
  requiresCheckpoint,
  transitionPhase,
  applyCheckpointApproval,
  getWorkflowSummary,
  createHandoffMessage,
  formatWorkflowReport,
  SDLCPhase,
  WorkflowStatus,
  TransitionStatus,
  AgentName,
  ArtifactType,
  type WorkflowState,
  type PhaseResult,
  type OrchestratorConfig,
  type Artifact,
} from "../../src/orchestrator/index.js";

describe("SDLC Workflow Integration", () => {
  let config: OrchestratorConfig;

  beforeEach(() => {
    // Use a minimal config for testing
    config = createOrchestrator().config;
  });

  describe("Complete Workflow Execution", () => {
    it("should execute a complete SDLC workflow from planning to monitoring", () => {
      // Initialize workflow
      let state = createWorkflowState("Feature Implementation", config);
      expect(state.status).toBe(WorkflowStatus.NOT_STARTED);
      expect(state.currentPhase).toBe(SDLCPhase.IDLE);

      // Start workflow - transition to planning
      state = {
        ...state,
        status: WorkflowStatus.IN_PROGRESS,
        currentPhase: SDLCPhase.PLANNING,
      };

      // Simulate planning phase completion
      const planningResult: PhaseResult = {
        phase: SDLCPhase.PLANNING,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 1000,
        artifacts: [createArtifact("spec", "docs/spec.md", AgentName.PLANNER)],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, planningResult);
      expect(state.currentPhase).toBe(SDLCPhase.DEVELOPMENT);
      expect(state.artifacts).toHaveLength(1);

      // Simulate development phase completion
      const devResult: PhaseResult = {
        phase: SDLCPhase.DEVELOPMENT,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 5000,
        artifacts: [
          createArtifact("code", "src/feature.ts", AgentName.DEVELOPER),
        ],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, devResult);
      expect(state.currentPhase).toBe(SDLCPhase.TESTING);

      // Simulate testing phase completion
      const testResult: PhaseResult = {
        phase: SDLCPhase.TESTING,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 2000,
        artifacts: [
          createArtifact("test", "src/feature.test.ts", AgentName.TESTER),
        ],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, testResult);
      // Review phase requires checkpoint
      expect(state.currentPhase).toBe(SDLCPhase.REVIEW);
      expect(state.status).toBe(WorkflowStatus.WAITING_APPROVAL);

      // Approve review checkpoint
      state = applyCheckpointApproval(state, {
        phase: SDLCPhase.REVIEW,
        approved: true,
        approvedBy: "engineer@example.com",
        approvedAt: new Date().toISOString(),
      });
      expect(state.status).toBe(WorkflowStatus.IN_PROGRESS);

      // Simulate review phase completion
      const reviewResult: PhaseResult = {
        phase: SDLCPhase.REVIEW,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 3000,
        artifacts: [
          createArtifact("report", "reports/review.md", AgentName.REVIEWER),
        ],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, reviewResult);
      // Deployment phase requires checkpoint
      expect(state.currentPhase).toBe(SDLCPhase.DEPLOYMENT);
      expect(state.status).toBe(WorkflowStatus.WAITING_APPROVAL);

      // Approve deployment checkpoint
      state = applyCheckpointApproval(state, {
        phase: SDLCPhase.DEPLOYMENT,
        approved: true,
        approvedBy: "lead@example.com",
        approvedAt: new Date().toISOString(),
      });

      // Simulate deployment phase completion
      const deployResult: PhaseResult = {
        phase: SDLCPhase.DEPLOYMENT,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 4000,
        artifacts: [
          createArtifact("release", "CHANGELOG.md", AgentName.DEPLOYER),
        ],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, deployResult);
      expect(state.currentPhase).toBe(SDLCPhase.MONITORING);

      // Simulate monitoring phase completion (final phase)
      const monitorResult: PhaseResult = {
        phase: SDLCPhase.MONITORING,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 1000,
        artifacts: [
          createArtifact("report", "reports/metrics.md", AgentName.MONITOR),
        ],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, monitorResult);
      expect(state.status).toBe(WorkflowStatus.COMPLETED);
      expect(state.currentPhase).toBe(SDLCPhase.IDLE);
      expect(state.completedAt).toBeDefined();

      // Verify all artifacts collected
      expect(state.artifacts).toHaveLength(6);

      // Verify workflow summary
      const summary = getWorkflowSummary(state);
      expect(summary.status).toBe(WorkflowStatus.COMPLETED);
      expect(summary.phasesCompleted).toBe(6); // 6 phases completed successfully
      expect(summary.errorCount).toBe(0);
    });

    it("should handle workflow failure and retry", () => {
      let state = createWorkflowState("Bug Fix", config);
      state = {
        ...state,
        status: WorkflowStatus.IN_PROGRESS,
        currentPhase: SDLCPhase.TESTING,
        iteration: 0,
      };

      // Simulate test failure requiring retry
      const failedTestResult: PhaseResult = {
        phase: SDLCPhase.TESTING,
        status: TransitionStatus.FAILURE,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 1500,
        artifacts: [],
        errors: ["Test suite failed: 5 tests failing"],
        warnings: [],
        requiresRetry: true,
        retryReason: "Test failures need to be fixed",
        nextPhase: SDLCPhase.DEVELOPMENT, // Go back to development
      };

      state = transitionPhase(state, config, failedTestResult);

      // Should go back to development phase for fixes
      expect(state.currentPhase).toBe(SDLCPhase.DEVELOPMENT);
      expect(state.status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(state.errors).toContain("Test suite failed: 5 tests failing");

      // Fix and re-run development
      const fixResult: PhaseResult = {
        phase: SDLCPhase.DEVELOPMENT,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 2000,
        artifacts: [],
        errors: [],
        warnings: [],
        requiresRetry: true, // This was a retry iteration
      };

      state = transitionPhase(state, config, fixResult);
      expect(state.iteration).toBe(1); // Iteration incremented
      expect(state.currentPhase).toBe(SDLCPhase.TESTING);
    });

    it("should fail workflow when max iterations exceeded", () => {
      let state = createWorkflowState("Unstable Feature", config);
      state = {
        ...state,
        status: WorkflowStatus.IN_PROGRESS,
        currentPhase: SDLCPhase.TESTING,
        iteration: config.maxIterations, // Already at max
      };

      const failedResult: PhaseResult = {
        phase: SDLCPhase.TESTING,
        status: TransitionStatus.FAILURE,
        startedAt: new Date().toISOString(),
        artifacts: [],
        errors: ["Persistent test failures"],
        warnings: [],
        requiresRetry: true,
      };

      state = transitionPhase(state, config, failedResult);

      // Workflow should fail, not retry
      expect(state.status).toBe(WorkflowStatus.FAILED);
      expect(state.completedAt).toBeDefined();
    });
  });

  describe("Phase Skipping", () => {
    it("should skip configured phases", () => {
      const skipConfig: OrchestratorConfig = {
        ...config,
        enablePhaseSkipping: true,
        skipPhases: [SDLCPhase.TESTING, SDLCPhase.MONITORING],
      };

      // From development, next should skip testing and go to review
      const nextAfterDev = getNextPhase(SDLCPhase.DEVELOPMENT, skipConfig);
      expect(nextAfterDev).toBe(SDLCPhase.REVIEW);

      // From deployment, should complete (skip monitoring)
      const nextAfterDeploy = getNextPhase(SDLCPhase.DEPLOYMENT, skipConfig);
      expect(nextAfterDeploy).toBeNull(); // No more phases
    });
  });

  describe("Checkpoint Rejection", () => {
    it("should pause workflow on checkpoint rejection", () => {
      let state = createWorkflowState("Risky Change", config);
      state = {
        ...state,
        status: WorkflowStatus.WAITING_APPROVAL,
        currentPhase: SDLCPhase.DEPLOYMENT,
      };

      state = applyCheckpointApproval(state, {
        phase: SDLCPhase.DEPLOYMENT,
        approved: false,
        reason: "Security concerns - needs additional review",
      });

      expect(state.status).toBe(WorkflowStatus.PAUSED);
      expect(state.errors).toContain(
        "Security concerns - needs additional review",
      );
    });
  });

  describe("Workflow Report Generation", () => {
    it("should generate comprehensive workflow report", () => {
      let state = createWorkflowState("Report Test", config);
      state = {
        ...state,
        status: WorkflowStatus.IN_PROGRESS,
        currentPhase: SDLCPhase.DEVELOPMENT,
        phases: [
          {
            phase: SDLCPhase.PLANNING,
            status: TransitionStatus.SUCCESS,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 1000,
            artifacts: [
              createArtifact("spec", "docs/spec.md", AgentName.PLANNER),
            ],
            errors: [],
            warnings: ["Consider adding more detail to requirements"],
          },
        ],
        artifacts: [createArtifact("spec", "docs/spec.md", AgentName.PLANNER)],
        checkpoints: [
          {
            phase: SDLCPhase.PLANNING,
            approved: true,
            approvedBy: "pm@example.com",
            approvedAt: new Date().toISOString(),
          },
        ],
      };

      const report = formatWorkflowReport(state);

      expect(report).toContain("# Workflow Report: Report Test");
      expect(report).toContain("**Status:**");
      expect(report).toContain("## Phase History");
      expect(report).toContain("## Artifacts");
      expect(report).toContain("## Human Checkpoints");
      expect(report).toContain("Approved");
      expect(report).toContain("pm@example.com");
    });
  });
});

describe("Agent Communication Integration", () => {
  describe("Agent Handoff Messages", () => {
    it("should create proper handoff messages between agents", () => {
      const artifact: Artifact = createArtifact(
        "spec",
        "docs/spec.md",
        AgentName.PLANNER,
      );

      const handoff = createHandoffMessage(
        AgentName.PLANNER,
        AgentName.DEVELOPER,
        SDLCPhase.DEVELOPMENT,
        {
          prdPath: "docs/prd.md",
          requirements: ["Feature A", "Feature B"],
          constraints: { deadline: "2026-04-01" },
        },
        [artifact],
      );

      expect(handoff.from).toBe(AgentName.PLANNER);
      expect(handoff.to).toBe(AgentName.DEVELOPER);
      expect(handoff.phase).toBe(SDLCPhase.DEVELOPMENT);
      expect(handoff.type).toBe("handoff");
      expect(handoff.artifacts).toHaveLength(1);
      expect(handoff.context).toHaveProperty("prdPath");
      expect(handoff.context).toHaveProperty("requirements");
      expect(handoff.id).toMatch(/^msg-/);
      expect(handoff.timestamp).toBeDefined();
    });

    it("should pass context and artifacts through complete workflow", () => {
      const workflowContext: Record<string, unknown> = {
        projectName: "Archon Feature",
        branch: "feature/new-agent",
      };

      // Simulate agent-to-agent context passing
      const plannerOutput = {
        spec: "Technical specification content",
        tasks: ["Task 1", "Task 2", "Task 3"],
      };

      const plannerHandoff = createHandoffMessage(
        AgentName.PLANNER,
        AgentName.DEVELOPER,
        SDLCPhase.DEVELOPMENT,
        { ...workflowContext, ...plannerOutput },
        [createArtifact("spec", "docs/spec.md", AgentName.PLANNER)],
      );

      // Developer receives planner context
      expect(plannerHandoff.context).toHaveProperty("projectName");
      expect(plannerHandoff.context).toHaveProperty("tasks");

      const developerOutput = {
        filesCreated: ["src/agent.ts", "src/agent.test.ts"],
        linesOfCode: 450,
      };

      const developerHandoff = createHandoffMessage(
        AgentName.DEVELOPER,
        AgentName.TESTER,
        SDLCPhase.TESTING,
        {
          ...plannerHandoff.context,
          ...developerOutput,
        },
        [
          ...plannerHandoff.artifacts,
          createArtifact("code", "src/agent.ts", AgentName.DEVELOPER),
        ],
      );

      // Tester receives accumulated context
      expect(developerHandoff.context).toHaveProperty("projectName");
      expect(developerHandoff.context).toHaveProperty("tasks");
      expect(developerHandoff.context).toHaveProperty("filesCreated");
      expect(developerHandoff.artifacts).toHaveLength(2);
    });
  });

  describe("Agent-Phase Mapping", () => {
    it("should correctly map all phases to their agents", () => {
      expect(getPhaseAgent(SDLCPhase.IDLE)).toBeNull();
      expect(getPhaseAgent(SDLCPhase.PLANNING)).toBe(AgentName.PLANNER);
      expect(getPhaseAgent(SDLCPhase.DEVELOPMENT)).toBe(AgentName.DEVELOPER);
      expect(getPhaseAgent(SDLCPhase.TESTING)).toBe(AgentName.TESTER);
      expect(getPhaseAgent(SDLCPhase.REVIEW)).toBe(AgentName.REVIEWER);
      expect(getPhaseAgent(SDLCPhase.DEPLOYMENT)).toBe(AgentName.DEPLOYER);
      expect(getPhaseAgent(SDLCPhase.MONITORING)).toBe(AgentName.MONITOR);
    });
  });

  describe("Phase Navigation", () => {
    it("should navigate forward through phases correctly", () => {
      const config = createOrchestrator().config;

      expect(getNextPhase(SDLCPhase.IDLE, config)).toBe(SDLCPhase.PLANNING);
      expect(getNextPhase(SDLCPhase.PLANNING, config)).toBe(
        SDLCPhase.DEVELOPMENT,
      );
      expect(getNextPhase(SDLCPhase.DEVELOPMENT, config)).toBe(
        SDLCPhase.TESTING,
      );
      expect(getNextPhase(SDLCPhase.TESTING, config)).toBe(SDLCPhase.REVIEW);
      expect(getNextPhase(SDLCPhase.REVIEW, config)).toBe(SDLCPhase.DEPLOYMENT);
      expect(getNextPhase(SDLCPhase.DEPLOYMENT, config)).toBe(
        SDLCPhase.MONITORING,
      );
      expect(getNextPhase(SDLCPhase.MONITORING, config)).toBeNull();
    });

    it("should navigate backward through phases correctly", () => {
      expect(getPreviousPhase(SDLCPhase.IDLE)).toBeNull();
      expect(getPreviousPhase(SDLCPhase.PLANNING)).toBe(SDLCPhase.IDLE);
      expect(getPreviousPhase(SDLCPhase.DEVELOPMENT)).toBe(SDLCPhase.PLANNING);
      expect(getPreviousPhase(SDLCPhase.TESTING)).toBe(SDLCPhase.DEVELOPMENT);
      expect(getPreviousPhase(SDLCPhase.REVIEW)).toBe(SDLCPhase.TESTING);
      expect(getPreviousPhase(SDLCPhase.DEPLOYMENT)).toBe(SDLCPhase.REVIEW);
      expect(getPreviousPhase(SDLCPhase.MONITORING)).toBe(SDLCPhase.DEPLOYMENT);
    });
  });

  describe("Checkpoint Requirements", () => {
    it("should identify checkpoint phases correctly", () => {
      const config = createOrchestrator().config;

      // Default checkpoints are at review and deployment
      expect(requiresCheckpoint(SDLCPhase.PLANNING, config)).toBe(false);
      expect(requiresCheckpoint(SDLCPhase.DEVELOPMENT, config)).toBe(false);
      expect(requiresCheckpoint(SDLCPhase.TESTING, config)).toBe(false);
      expect(requiresCheckpoint(SDLCPhase.REVIEW, config)).toBe(true);
      expect(requiresCheckpoint(SDLCPhase.DEPLOYMENT, config)).toBe(true);
      expect(requiresCheckpoint(SDLCPhase.MONITORING, config)).toBe(false);
    });

    it("should respect custom checkpoint configuration", () => {
      const strictConfig: OrchestratorConfig = {
        ...createOrchestrator().config,
        checkpointPhases: [
          SDLCPhase.PLANNING,
          SDLCPhase.DEVELOPMENT,
          SDLCPhase.REVIEW,
          SDLCPhase.DEPLOYMENT,
        ],
      };

      expect(requiresCheckpoint(SDLCPhase.PLANNING, strictConfig)).toBe(true);
      expect(requiresCheckpoint(SDLCPhase.DEVELOPMENT, strictConfig)).toBe(
        true,
      );
      expect(requiresCheckpoint(SDLCPhase.TESTING, strictConfig)).toBe(false);
    });

    it("should disable checkpoints when configured", () => {
      const noCheckpointConfig: OrchestratorConfig = {
        ...createOrchestrator().config,
        enableCheckpoints: false,
      };

      expect(requiresCheckpoint(SDLCPhase.REVIEW, noCheckpointConfig)).toBe(
        false,
      );
      expect(requiresCheckpoint(SDLCPhase.DEPLOYMENT, noCheckpointConfig)).toBe(
        false,
      );
    });
  });
});

describe("Multi-Agent Workflow Scenarios", () => {
  describe("TDD Workflow", () => {
    it("should support test-first development cycle", () => {
      const config = createOrchestrator({
        skipPhases: [SDLCPhase.PLANNING], // Skip planning for TDD
      }).config;

      let state = createWorkflowState("TDD Feature", config);

      // Start directly with testing (write tests first)
      state = {
        ...state,
        status: WorkflowStatus.IN_PROGRESS,
        currentPhase: SDLCPhase.TESTING,
      };

      // Write failing tests
      const testFirstResult: PhaseResult = {
        phase: SDLCPhase.TESTING,
        status: TransitionStatus.FAILURE, // Tests fail initially
        startedAt: new Date().toISOString(),
        artifacts: [
          createArtifact("test", "src/feature.test.ts", AgentName.TESTER),
        ],
        errors: ["Tests written but implementation missing"],
        warnings: [],
        requiresRetry: true,
        nextPhase: SDLCPhase.DEVELOPMENT,
      };

      state = transitionPhase(state, config, testFirstResult);
      expect(state.currentPhase).toBe(SDLCPhase.DEVELOPMENT);

      // Implement to make tests pass
      const implResult: PhaseResult = {
        phase: SDLCPhase.DEVELOPMENT,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        artifacts: [
          createArtifact("code", "src/feature.ts", AgentName.DEVELOPER),
        ],
        errors: [],
        warnings: [],
        requiresRetry: true,
      };

      state = transitionPhase(state, config, implResult);
      expect(state.currentPhase).toBe(SDLCPhase.TESTING);
      expect(state.iteration).toBe(1);

      // Tests now pass
      const testPassResult: PhaseResult = {
        phase: SDLCPhase.TESTING,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        artifacts: [
          createArtifact("report", "coverage/report.html", AgentName.TESTER),
        ],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, config, testPassResult);
      expect(state.currentPhase).toBe(SDLCPhase.REVIEW);
    });
  });

  describe("Hotfix Workflow", () => {
    it("should support expedited hotfix workflow", () => {
      const hotfixConfig = createOrchestrator({
        skipPhases: [SDLCPhase.PLANNING, SDLCPhase.MONITORING],
        checkpointPhases: [SDLCPhase.DEPLOYMENT], // Only deploy needs approval
      }).config;

      let state = createWorkflowState("Production Hotfix", hotfixConfig);

      // Start from development
      state = {
        ...state,
        status: WorkflowStatus.IN_PROGRESS,
        currentPhase: SDLCPhase.DEVELOPMENT,
      };

      // Quick fix
      const fixResult: PhaseResult = {
        phase: SDLCPhase.DEVELOPMENT,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 500,
        artifacts: [createArtifact("code", "src/fix.ts", AgentName.DEVELOPER)],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, hotfixConfig, fixResult);
      expect(state.currentPhase).toBe(SDLCPhase.TESTING);

      // Quick test
      const testResult: PhaseResult = {
        phase: SDLCPhase.TESTING,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 300,
        artifacts: [],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, hotfixConfig, testResult);
      // Review doesn't need checkpoint in hotfix config
      expect(state.currentPhase).toBe(SDLCPhase.REVIEW);
      expect(state.status).toBe(WorkflowStatus.IN_PROGRESS);

      // Quick review
      const reviewResult: PhaseResult = {
        phase: SDLCPhase.REVIEW,
        status: TransitionStatus.SUCCESS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 200,
        artifacts: [],
        errors: [],
        warnings: [],
      };

      state = transitionPhase(state, hotfixConfig, reviewResult);
      // Deployment needs approval
      expect(state.currentPhase).toBe(SDLCPhase.DEPLOYMENT);
      expect(state.status).toBe(WorkflowStatus.WAITING_APPROVAL);
    });
  });
});

// Helper function to create artifacts
function createArtifact(
  type: "spec" | "code" | "test" | "doc" | "report" | "build" | "release",
  path: string,
  createdBy:
    | "planner"
    | "developer"
    | "tester"
    | "reviewer"
    | "deployer"
    | "monitor",
): Artifact {
  return {
    type,
    path,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}
