/**
 * SDLC Orchestrator Tests
 *
 * Tests for the workflow state machine, phase transitions, human checkpoints,
 * and failure recovery mechanisms.
 */

import { describe, it, expect } from "vitest";
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
  ArtifactSchema,
  AgentMessageSchema,
  CheckpointApprovalSchema,
  PhaseResultSchema,
  WorkflowStateSchema,
  WorkflowSummarySchema,
  type OrchestratorConfig,
  type PhaseResult,
  type CheckpointApproval,
  type Artifact,
} from "./index.js";

describe("SDLC Orchestrator", () => {
  // ============================================================
  // Orchestrator Creation Tests
  // ============================================================

  describe("createOrchestrator", () => {
    it("should create orchestrator with default config", () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.name).toBe("Orchestrator");
      expect(orchestrator.role).toBe("SDLC Workflow Orchestrator");
      expect(orchestrator.status).toBe("active");
      expect(orchestrator.version).toBe("0.1.0");
    });

    it("should have correct default capabilities", () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.capabilities.canModifyFiles).toBe(true);
      expect(orchestrator.capabilities.canExecuteCommands).toBe(true);
      expect(orchestrator.capabilities.canAccessNetwork).toBe(false);
      expect(orchestrator.capabilities.requiresHumanApproval).toBe(true);
    });

    it("should have correct default config", () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.config.enableCheckpoints).toBe(true);
      expect(orchestrator.config.checkpointPhases).toContain(SDLCPhase.REVIEW);
      expect(orchestrator.config.checkpointPhases).toContain(
        SDLCPhase.DEPLOYMENT,
      );
      expect(orchestrator.config.maxIterations).toBe(10);
      expect(orchestrator.config.phaseTimeout).toBe(300000);
      expect(orchestrator.config.enableAutoRecovery).toBe(true);
      expect(orchestrator.config.maxRecoveryAttempts).toBe(3);
    });

    it("should allow config overrides", () => {
      const orchestrator = createOrchestrator({
        maxIterations: 5,
        enableCheckpoints: false,
        checkpointPhases: [SDLCPhase.PLANNING],
      });

      expect(orchestrator.config.maxIterations).toBe(5);
      expect(orchestrator.config.enableCheckpoints).toBe(false);
      expect(orchestrator.config.checkpointPhases).toEqual([
        SDLCPhase.PLANNING,
      ]);
    });

    it("should merge config with defaults", () => {
      const orchestrator = createOrchestrator({
        maxIterations: 20,
      });

      expect(orchestrator.config.maxIterations).toBe(20);
      expect(orchestrator.config.enableCheckpoints).toBe(true); // Default preserved
      expect(orchestrator.config.phaseTimeout).toBe(300000); // Default preserved
    });
  });

  // ============================================================
  // Workflow State Tests
  // ============================================================

  describe("createWorkflowState", () => {
    it("should create initial workflow state", () => {
      const config = createOrchestrator().config;
      const state = createWorkflowState("Test Workflow", config);

      expect(state.name).toBe("Test Workflow");
      expect(state.status).toBe(WorkflowStatus.NOT_STARTED);
      expect(state.currentPhase).toBe(SDLCPhase.IDLE);
      expect(state.phases).toEqual([]);
      expect(state.artifacts).toEqual([]);
      expect(state.checkpoints).toEqual([]);
      expect(state.iteration).toBe(0);
      expect(state.maxIterations).toBe(10);
      expect(state.errors).toEqual([]);
    });

    it("should generate unique workflow IDs", () => {
      const config = createOrchestrator().config;
      const state1 = createWorkflowState("Workflow 1", config);
      const state2 = createWorkflowState("Workflow 2", config);

      expect(state1.id).not.toBe(state2.id);
      expect(state1.id).toMatch(/^wf-/);
      expect(state2.id).toMatch(/^wf-/);
    });

    it("should accept initial context", () => {
      const config = createOrchestrator().config;
      const context = { prdPath: "docs/PRD.md", author: "test" };
      const state = createWorkflowState("Test", config, context);

      expect(state.context).toEqual(context);
    });

    it("should set timestamps", () => {
      const config = createOrchestrator().config;
      const before = new Date().toISOString();
      const state = createWorkflowState("Test", config);
      const after = new Date().toISOString();

      expect(state.startedAt >= before).toBe(true);
      expect(state.startedAt <= after).toBe(true);
      expect(state.updatedAt >= before).toBe(true);
      expect(state.updatedAt <= after).toBe(true);
    });
  });

  // ============================================================
  // Phase Navigation Tests
  // ============================================================

  describe("getNextPhase", () => {
    const config = createOrchestrator().config;

    it("should return planning after idle", () => {
      expect(getNextPhase(SDLCPhase.IDLE, config)).toBe(SDLCPhase.PLANNING);
    });

    it("should return development after planning", () => {
      expect(getNextPhase(SDLCPhase.PLANNING, config)).toBe(
        SDLCPhase.DEVELOPMENT,
      );
    });

    it("should return testing after development", () => {
      expect(getNextPhase(SDLCPhase.DEVELOPMENT, config)).toBe(
        SDLCPhase.TESTING,
      );
    });

    it("should return review after testing", () => {
      expect(getNextPhase(SDLCPhase.TESTING, config)).toBe(SDLCPhase.REVIEW);
    });

    it("should return deployment after review", () => {
      expect(getNextPhase(SDLCPhase.REVIEW, config)).toBe(SDLCPhase.DEPLOYMENT);
    });

    it("should return monitoring after deployment", () => {
      expect(getNextPhase(SDLCPhase.DEPLOYMENT, config)).toBe(
        SDLCPhase.MONITORING,
      );
    });

    it("should return null after monitoring", () => {
      expect(getNextPhase(SDLCPhase.MONITORING, config)).toBe(null);
    });

    it("should skip phases when configured", () => {
      const skipConfig: OrchestratorConfig = {
        ...config,
        enablePhaseSkipping: true,
        skipPhases: [SDLCPhase.TESTING],
      };

      expect(getNextPhase(SDLCPhase.DEVELOPMENT, skipConfig)).toBe(
        SDLCPhase.REVIEW,
      );
    });

    it("should skip multiple phases", () => {
      const skipConfig: OrchestratorConfig = {
        ...config,
        enablePhaseSkipping: true,
        skipPhases: [SDLCPhase.TESTING, SDLCPhase.REVIEW],
      };

      expect(getNextPhase(SDLCPhase.DEVELOPMENT, skipConfig)).toBe(
        SDLCPhase.DEPLOYMENT,
      );
    });
  });

  describe("getPreviousPhase", () => {
    it("should return null for idle", () => {
      expect(getPreviousPhase(SDLCPhase.IDLE)).toBe(null);
    });

    it("should return idle for planning", () => {
      expect(getPreviousPhase(SDLCPhase.PLANNING)).toBe(SDLCPhase.IDLE);
    });

    it("should return planning for development", () => {
      expect(getPreviousPhase(SDLCPhase.DEVELOPMENT)).toBe(SDLCPhase.PLANNING);
    });

    it("should return development for testing", () => {
      expect(getPreviousPhase(SDLCPhase.TESTING)).toBe(SDLCPhase.DEVELOPMENT);
    });

    it("should return testing for review", () => {
      expect(getPreviousPhase(SDLCPhase.REVIEW)).toBe(SDLCPhase.TESTING);
    });

    it("should return review for deployment", () => {
      expect(getPreviousPhase(SDLCPhase.DEPLOYMENT)).toBe(SDLCPhase.REVIEW);
    });

    it("should return deployment for monitoring", () => {
      expect(getPreviousPhase(SDLCPhase.MONITORING)).toBe(SDLCPhase.DEPLOYMENT);
    });
  });

  describe("getPhaseAgent", () => {
    it("should return null for idle phase", () => {
      expect(getPhaseAgent(SDLCPhase.IDLE)).toBe(null);
    });

    it("should return planner for planning phase", () => {
      expect(getPhaseAgent(SDLCPhase.PLANNING)).toBe(AgentName.PLANNER);
    });

    it("should return developer for development phase", () => {
      expect(getPhaseAgent(SDLCPhase.DEVELOPMENT)).toBe(AgentName.DEVELOPER);
    });

    it("should return tester for testing phase", () => {
      expect(getPhaseAgent(SDLCPhase.TESTING)).toBe(AgentName.TESTER);
    });

    it("should return reviewer for review phase", () => {
      expect(getPhaseAgent(SDLCPhase.REVIEW)).toBe(AgentName.REVIEWER);
    });

    it("should return deployer for deployment phase", () => {
      expect(getPhaseAgent(SDLCPhase.DEPLOYMENT)).toBe(AgentName.DEPLOYER);
    });

    it("should return monitor for monitoring phase", () => {
      expect(getPhaseAgent(SDLCPhase.MONITORING)).toBe(AgentName.MONITOR);
    });
  });

  // ============================================================
  // Checkpoint Tests
  // ============================================================

  describe("requiresCheckpoint", () => {
    it("should return true for review phase by default", () => {
      const config = createOrchestrator().config;
      expect(requiresCheckpoint(SDLCPhase.REVIEW, config)).toBe(true);
    });

    it("should return true for deployment phase by default", () => {
      const config = createOrchestrator().config;
      expect(requiresCheckpoint(SDLCPhase.DEPLOYMENT, config)).toBe(true);
    });

    it("should return false for planning phase by default", () => {
      const config = createOrchestrator().config;
      expect(requiresCheckpoint(SDLCPhase.PLANNING, config)).toBe(false);
    });

    it("should return false when checkpoints disabled", () => {
      const config: OrchestratorConfig = {
        ...createOrchestrator().config,
        enableCheckpoints: false,
      };
      expect(requiresCheckpoint(SDLCPhase.REVIEW, config)).toBe(false);
    });

    it("should respect custom checkpoint phases", () => {
      const config: OrchestratorConfig = {
        ...createOrchestrator().config,
        checkpointPhases: [SDLCPhase.PLANNING, SDLCPhase.TESTING],
      };

      expect(requiresCheckpoint(SDLCPhase.PLANNING, config)).toBe(true);
      expect(requiresCheckpoint(SDLCPhase.TESTING, config)).toBe(true);
      expect(requiresCheckpoint(SDLCPhase.REVIEW, config)).toBe(false);
    });
  });

  // ============================================================
  // Phase Transition Tests
  // ============================================================

  describe("transitionPhase", () => {
    const config = createOrchestrator().config;

    const createSuccessResult = (phase: SDLCPhase): PhaseResult => ({
      phase,
      status: TransitionStatus.SUCCESS,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 1000,
      artifacts: [],
      errors: [],
      warnings: [],
    });

    const createFailureResult = (
      phase: SDLCPhase,
      requiresRetry = false,
    ): PhaseResult => ({
      phase,
      status: TransitionStatus.FAILURE,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 500,
      artifacts: [],
      errors: ["Test failed"],
      warnings: [],
      requiresRetry,
      retryReason: requiresRetry ? "Tests need fixes" : undefined,
    });

    it("should transition to next phase on success", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.PLANNING;
      state.status = WorkflowStatus.IN_PROGRESS;

      const result = createSuccessResult(SDLCPhase.PLANNING);
      const newState = transitionPhase(state, config, result);

      expect(newState.currentPhase).toBe(SDLCPhase.DEVELOPMENT);
      expect(newState.status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(newState.phases).toHaveLength(1);
    });

    it("should complete workflow after monitoring", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.MONITORING;
      state.status = WorkflowStatus.IN_PROGRESS;

      const result = createSuccessResult(SDLCPhase.MONITORING);
      const newState = transitionPhase(state, config, result);

      expect(newState.currentPhase).toBe(SDLCPhase.IDLE);
      expect(newState.status).toBe(WorkflowStatus.COMPLETED);
      expect(newState.completedAt).toBeDefined();
    });

    it("should fail workflow on non-retryable failure", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.TESTING;
      state.status = WorkflowStatus.IN_PROGRESS;

      const result = createFailureResult(SDLCPhase.TESTING, false);
      const newState = transitionPhase(state, config, result);

      expect(newState.status).toBe(WorkflowStatus.FAILED);
      expect(newState.errors).toContain("Test failed");
    });

    it("should retry on retryable failure within iteration limit", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.TESTING;
      state.status = WorkflowStatus.IN_PROGRESS;
      state.iteration = 0;

      const result = createFailureResult(SDLCPhase.TESTING, true);
      const newState = transitionPhase(state, config, result);

      expect(newState.status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(newState.currentPhase).toBe(SDLCPhase.DEVELOPMENT);
    });

    it("should fail when iteration limit reached", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.TESTING;
      state.status = WorkflowStatus.IN_PROGRESS;
      state.iteration = 10; // At max

      const result = createFailureResult(SDLCPhase.TESTING, true);
      const newState = transitionPhase(state, config, result);

      expect(newState.status).toBe(WorkflowStatus.FAILED);
    });

    it("should wait for approval when entering checkpoint phase", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.TESTING;
      state.status = WorkflowStatus.IN_PROGRESS;

      const result = createSuccessResult(SDLCPhase.TESTING);
      const newState = transitionPhase(state, config, result);

      expect(newState.currentPhase).toBe(SDLCPhase.REVIEW);
      expect(newState.status).toBe(WorkflowStatus.WAITING_APPROVAL);
    });

    it("should merge artifacts from phase result", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.PLANNING;

      const artifact: Artifact = {
        type: ArtifactType.SPEC,
        path: "docs/spec.md",
        createdAt: new Date().toISOString(),
        createdBy: AgentName.PLANNER,
      };

      const result: PhaseResult = {
        ...createSuccessResult(SDLCPhase.PLANNING),
        artifacts: [artifact],
      };

      const newState = transitionPhase(state, config, result);

      expect(newState.artifacts).toHaveLength(1);
      expect(newState.artifacts[0]?.path).toBe("docs/spec.md");
    });
  });

  // ============================================================
  // Checkpoint Approval Tests
  // ============================================================

  describe("applyCheckpointApproval", () => {
    const config = createOrchestrator().config;

    it("should continue workflow on approval", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.REVIEW;
      state.status = WorkflowStatus.WAITING_APPROVAL;

      const approval: CheckpointApproval = {
        phase: SDLCPhase.REVIEW,
        approved: true,
        approvedBy: "user@example.com",
        approvedAt: new Date().toISOString(),
      };

      const newState = applyCheckpointApproval(state, approval);

      expect(newState.status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(newState.checkpoints).toHaveLength(1);
      expect(newState.checkpoints[0]?.approved).toBe(true);
    });

    it("should pause workflow on rejection", () => {
      const state = createWorkflowState("Test", config);
      state.currentPhase = SDLCPhase.REVIEW;
      state.status = WorkflowStatus.WAITING_APPROVAL;

      const approval: CheckpointApproval = {
        phase: SDLCPhase.REVIEW,
        approved: false,
        reason: "Needs more work",
      };

      const newState = applyCheckpointApproval(state, approval);

      expect(newState.status).toBe(WorkflowStatus.PAUSED);
      expect(newState.errors).toContain("Needs more work");
    });

    it("should use default message when rejection has no reason", () => {
      const state = createWorkflowState("Test", config);
      state.status = WorkflowStatus.WAITING_APPROVAL;

      const approval: CheckpointApproval = {
        phase: SDLCPhase.REVIEW,
        approved: false,
      };

      const newState = applyCheckpointApproval(state, approval);

      expect(newState.errors).toContain("Checkpoint rejected");
    });
  });

  // ============================================================
  // Workflow Summary Tests
  // ============================================================

  describe("getWorkflowSummary", () => {
    const config = createOrchestrator().config;

    it("should generate summary for empty workflow", () => {
      const state = createWorkflowState("Test", config);
      const summary = getWorkflowSummary(state);

      expect(summary.id).toBe(state.id);
      expect(summary.name).toBe("Test");
      expect(summary.status).toBe(WorkflowStatus.NOT_STARTED);
      expect(summary.phasesCompleted).toBe(0);
      expect(summary.currentPhase).toBe(SDLCPhase.IDLE);
      expect(summary.artifactCount).toBe(0);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
    });

    it("should count completed phases", () => {
      const state = createWorkflowState("Test", config);
      state.phases = [
        {
          phase: SDLCPhase.PLANNING,
          status: TransitionStatus.SUCCESS,
          startedAt: new Date().toISOString(),
          artifacts: [],
          errors: [],
          warnings: [],
        },
        {
          phase: SDLCPhase.DEVELOPMENT,
          status: TransitionStatus.SUCCESS,
          startedAt: new Date().toISOString(),
          artifacts: [],
          errors: [],
          warnings: [],
        },
      ];

      const summary = getWorkflowSummary(state);

      expect(summary.phasesCompleted).toBe(2);
    });

    it("should count skipped phases as completed", () => {
      const state = createWorkflowState("Test", config);
      state.phases = [
        {
          phase: SDLCPhase.PLANNING,
          status: TransitionStatus.SKIPPED,
          startedAt: new Date().toISOString(),
          artifacts: [],
          errors: [],
          warnings: [],
        },
      ];

      const summary = getWorkflowSummary(state);

      expect(summary.phasesCompleted).toBe(1);
    });

    it("should not count failed phases as completed", () => {
      const state = createWorkflowState("Test", config);
      state.phases = [
        {
          phase: SDLCPhase.TESTING,
          status: TransitionStatus.FAILURE,
          startedAt: new Date().toISOString(),
          artifacts: [],
          errors: ["Test failed"],
          warnings: [],
        },
      ];

      const summary = getWorkflowSummary(state);

      expect(summary.phasesCompleted).toBe(0);
      expect(summary.errorCount).toBe(1);
    });

    it("should count artifacts", () => {
      const state = createWorkflowState("Test", config);
      state.artifacts = [
        {
          type: ArtifactType.CODE,
          path: "src/file.ts",
          createdAt: new Date().toISOString(),
          createdBy: AgentName.DEVELOPER,
        },
        {
          type: ArtifactType.TEST,
          path: "src/file.test.ts",
          createdAt: new Date().toISOString(),
          createdBy: AgentName.TESTER,
        },
      ];

      const summary = getWorkflowSummary(state);

      expect(summary.artifactCount).toBe(2);
    });

    it("should detect pending approval", () => {
      const state = createWorkflowState("Test", config);
      state.status = WorkflowStatus.WAITING_APPROVAL;

      const summary = getWorkflowSummary(state);

      expect(summary.humanApprovalsPending).toBe(1);
    });
  });

  // ============================================================
  // Agent Handoff Tests
  // ============================================================

  describe("createHandoffMessage", () => {
    it("should create a valid handoff message", () => {
      const message = createHandoffMessage(
        "planner",
        "developer",
        SDLCPhase.DEVELOPMENT,
        { specPath: "docs/spec.md" },
        [],
      );

      expect(message.from).toBe("planner");
      expect(message.to).toBe("developer");
      expect(message.phase).toBe(SDLCPhase.DEVELOPMENT);
      expect(message.type).toBe("handoff");
      expect(message.context).toEqual({ specPath: "docs/spec.md" });
      expect(message.timestamp).toBeDefined();
    });

    it("should generate unique message IDs", () => {
      const msg1 = createHandoffMessage(
        "planner",
        "developer",
        SDLCPhase.DEVELOPMENT,
        {},
        [],
      );
      const msg2 = createHandoffMessage(
        "developer",
        "tester",
        SDLCPhase.TESTING,
        {},
        [],
      );

      expect(msg1.id).not.toBe(msg2.id);
      expect(msg1.id).toMatch(/^msg-/);
    });

    it("should include artifacts", () => {
      const artifacts: Artifact[] = [
        {
          type: ArtifactType.CODE,
          path: "src/feature.ts",
          createdAt: new Date().toISOString(),
          createdBy: AgentName.DEVELOPER,
        },
      ];

      const message = createHandoffMessage(
        "developer",
        "tester",
        SDLCPhase.TESTING,
        {},
        artifacts,
      );

      expect(message.artifacts).toHaveLength(1);
      expect(message.artifacts[0]?.path).toBe("src/feature.ts");
    });
  });

  // ============================================================
  // Report Formatting Tests
  // ============================================================

  describe("formatWorkflowReport", () => {
    const config = createOrchestrator().config;

    it("should format basic workflow report", () => {
      const state = createWorkflowState("Feature: Dark Mode", config);
      const report = formatWorkflowReport(state);

      expect(report).toContain("# Workflow Report: Feature: Dark Mode");
      expect(report).toContain(`**ID:** ${state.id}`);
      expect(report).toContain("**Status:**");
      expect(report).toContain("not_started");
    });

    it("should show phase history", () => {
      const state = createWorkflowState("Test", config);
      state.phases = [
        {
          phase: SDLCPhase.PLANNING,
          status: TransitionStatus.SUCCESS,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 5000,
          artifacts: [],
          errors: [],
          warnings: [],
        },
      ];

      const report = formatWorkflowReport(state);

      expect(report).toContain("## Phase History");
      expect(report).toContain("planning");
      expect(report).toContain("success");
    });

    it("should show artifacts", () => {
      const state = createWorkflowState("Test", config);
      state.artifacts = [
        {
          type: ArtifactType.SPEC,
          path: "docs/spec.md",
          createdAt: new Date().toISOString(),
          createdBy: AgentName.PLANNER,
        },
      ];

      const report = formatWorkflowReport(state);

      expect(report).toContain("## Artifacts");
      expect(report).toContain("docs/spec.md");
      expect(report).toContain("planner");
    });

    it("should show checkpoints", () => {
      const state = createWorkflowState("Test", config);
      state.checkpoints = [
        {
          phase: SDLCPhase.REVIEW,
          approved: true,
          approvedBy: "user@example.com",
          approvedAt: new Date().toISOString(),
        },
      ];

      const report = formatWorkflowReport(state);

      expect(report).toContain("## Human Checkpoints");
      expect(report).toContain("Approved");
      expect(report).toContain("user@example.com");
    });

    it("should show errors", () => {
      const state = createWorkflowState("Test", config);
      state.errors = ["Build failed", "Tests timeout"];

      const report = formatWorkflowReport(state);

      expect(report).toContain("## Errors");
      expect(report).toContain("Build failed");
      expect(report).toContain("Tests timeout");
    });

    it("should show summary statistics", () => {
      const state = createWorkflowState("Test", config);
      state.artifacts = [
        {
          type: ArtifactType.CODE,
          path: "a.ts",
          createdAt: new Date().toISOString(),
          createdBy: AgentName.DEVELOPER,
        },
        {
          type: ArtifactType.CODE,
          path: "b.ts",
          createdAt: new Date().toISOString(),
          createdBy: AgentName.DEVELOPER,
        },
      ];

      const report = formatWorkflowReport(state);

      expect(report).toContain("## Summary");
      expect(report).toContain("**Artifacts Created:** 2");
    });
  });

  // ============================================================
  // Zod Schema Tests
  // ============================================================

  describe("Zod Schemas", () => {
    describe("ArtifactSchema", () => {
      it("should validate valid artifact", () => {
        const artifact = {
          type: "code",
          path: "src/file.ts",
          createdAt: new Date().toISOString(),
          createdBy: "developer",
        };

        const result = ArtifactSchema.safeParse(artifact);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const artifact = {
          type: "spec",
          path: "docs/spec.md",
          content: "# Spec content",
          metadata: { version: 1 },
          createdAt: new Date().toISOString(),
          createdBy: "planner",
        };

        const result = ArtifactSchema.safeParse(artifact);
        expect(result.success).toBe(true);
      });

      it("should reject invalid type", () => {
        const artifact = {
          type: "invalid",
          path: "file.ts",
          createdAt: new Date().toISOString(),
          createdBy: "developer",
        };

        const result = ArtifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });
    });

    describe("AgentMessageSchema", () => {
      it("should validate valid message", () => {
        const message = {
          id: "msg-123",
          from: "planner",
          to: "developer",
          phase: "development",
          type: "handoff",
          context: {},
          artifacts: [],
          timestamp: new Date().toISOString(),
        };

        const result = AgentMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
      });

      it("should accept orchestrator as from/to", () => {
        const message = {
          id: "msg-123",
          from: "orchestrator",
          to: "planner",
          phase: "planning",
          type: "request",
          context: {},
          artifacts: [],
          timestamp: new Date().toISOString(),
        };

        const result = AgentMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
      });
    });

    describe("CheckpointApprovalSchema", () => {
      it("should validate approval", () => {
        const approval = {
          phase: "review",
          approved: true,
          approvedBy: "user@example.com",
          approvedAt: new Date().toISOString(),
        };

        const result = CheckpointApprovalSchema.safeParse(approval);
        expect(result.success).toBe(true);
      });

      it("should validate rejection", () => {
        const approval = {
          phase: "deployment",
          approved: false,
          reason: "Not ready for production",
        };

        const result = CheckpointApprovalSchema.safeParse(approval);
        expect(result.success).toBe(true);
      });
    });

    describe("PhaseResultSchema", () => {
      it("should validate success result", () => {
        const result = {
          phase: "testing",
          status: "success",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 5000,
          artifacts: [],
          errors: [],
          warnings: [],
        };

        const parsed = PhaseResultSchema.safeParse(result);
        expect(parsed.success).toBe(true);
      });

      it("should validate failure with retry", () => {
        const result = {
          phase: "testing",
          status: "failure",
          startedAt: new Date().toISOString(),
          artifacts: [],
          errors: ["Test failed"],
          warnings: [],
          requiresRetry: true,
          retryReason: "Fix tests",
          nextPhase: "development",
        };

        const parsed = PhaseResultSchema.safeParse(result);
        expect(parsed.success).toBe(true);
      });
    });

    describe("WorkflowStateSchema", () => {
      it("should validate complete state", () => {
        const state = {
          id: "wf-123",
          name: "Test Workflow",
          status: "in_progress",
          currentPhase: "development",
          phases: [],
          context: {},
          artifacts: [],
          checkpoints: [],
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          iteration: 1,
          maxIterations: 10,
          errors: [],
        };

        const result = WorkflowStateSchema.safeParse(state);
        expect(result.success).toBe(true);
      });
    });

    describe("WorkflowSummarySchema", () => {
      it("should validate summary", () => {
        const summary = {
          id: "wf-123",
          name: "Test",
          status: "completed",
          phasesCompleted: 5,
          totalPhases: 5,
          currentPhase: "idle",
          artifactCount: 10,
          errorCount: 0,
          warningCount: 2,
          duration: 60000,
          iteration: 1,
          humanApprovalsPending: 0,
        };

        const result = WorkflowSummarySchema.safeParse(summary);
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================
  // Type Constants Tests
  // ============================================================

  describe("Type Constants", () => {
    describe("SDLCPhase", () => {
      it("should have all phases", () => {
        expect(SDLCPhase.IDLE).toBe("idle");
        expect(SDLCPhase.PLANNING).toBe("planning");
        expect(SDLCPhase.DEVELOPMENT).toBe("development");
        expect(SDLCPhase.TESTING).toBe("testing");
        expect(SDLCPhase.REVIEW).toBe("review");
        expect(SDLCPhase.DEPLOYMENT).toBe("deployment");
        expect(SDLCPhase.MONITORING).toBe("monitoring");
      });
    });

    describe("WorkflowStatus", () => {
      it("should have all statuses", () => {
        expect(WorkflowStatus.NOT_STARTED).toBe("not_started");
        expect(WorkflowStatus.IN_PROGRESS).toBe("in_progress");
        expect(WorkflowStatus.PAUSED).toBe("paused");
        expect(WorkflowStatus.WAITING_APPROVAL).toBe("waiting_approval");
        expect(WorkflowStatus.COMPLETED).toBe("completed");
        expect(WorkflowStatus.FAILED).toBe("failed");
        expect(WorkflowStatus.CANCELLED).toBe("cancelled");
      });
    });

    describe("TransitionStatus", () => {
      it("should have all statuses", () => {
        expect(TransitionStatus.SUCCESS).toBe("success");
        expect(TransitionStatus.FAILURE).toBe("failure");
        expect(TransitionStatus.BLOCKED).toBe("blocked");
        expect(TransitionStatus.SKIPPED).toBe("skipped");
      });
    });

    describe("AgentName", () => {
      it("should have all agents", () => {
        expect(AgentName.PLANNER).toBe("planner");
        expect(AgentName.DEVELOPER).toBe("developer");
        expect(AgentName.TESTER).toBe("tester");
        expect(AgentName.REVIEWER).toBe("reviewer");
        expect(AgentName.DEPLOYER).toBe("deployer");
        expect(AgentName.MONITOR).toBe("monitor");
      });
    });

    describe("ArtifactType", () => {
      it("should have all artifact types", () => {
        expect(ArtifactType.SPEC).toBe("spec");
        expect(ArtifactType.CODE).toBe("code");
        expect(ArtifactType.TEST).toBe("test");
        expect(ArtifactType.DOC).toBe("doc");
        expect(ArtifactType.REPORT).toBe("report");
        expect(ArtifactType.BUILD).toBe("build");
        expect(ArtifactType.RELEASE).toBe("release");
      });
    });
  });
});
