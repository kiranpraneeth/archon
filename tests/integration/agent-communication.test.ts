/**
 * Agent Communication Integration Tests
 *
 * These tests verify that agents can communicate effectively,
 * share context, and produce compatible outputs for handoffs.
 */

import { describe, it, expect } from "vitest";

// Import all agents
import {
  createReviewAgent,
  formatReviewAsMarkdown,
} from "../../src/agents/reviewer/index.js";
import {
  createTesterAgent,
  formatTestReport,
  type TestReport,
} from "../../src/agents/tester/index.js";
import {
  createDocumenterAgent,
  formatDocReport,
  formatAuditReport,
  type DocReport,
  type DocAuditReport,
} from "../../src/agents/documenter/index.js";
import {
  createPlannerAgent,
  formatTechnicalSpec,
  type TechnicalSpec,
} from "../../src/agents/planner/index.js";
import {
  createDeveloperAgent,
  formatGenerationResult,
  formatAnalysisResult,
  type CodeGenerationResult,
  type CodeAnalysisResult,
} from "../../src/agents/developer/index.js";
import {
  createDeployerAgent,
  formatBuildResult,
  formatReleaseNotes,
  formatDeploymentResult,
  type BuildResult,
  type ReleaseNotes,
  type DeploymentResult,
} from "../../src/agents/deployer/index.js";
import {
  createMonitorAgent,
  formatMetricsReport,
  formatErrorReport,
  type MetricsReport,
  type ErrorReport,
} from "../../src/agents/monitor/index.js";
import {
  createOrchestrator,
  createHandoffMessage,
  SDLCPhase,
  AgentName,
} from "../../src/orchestrator/index.js";
import type { ReviewResult } from "../../src/core/types.js";

describe("Agent Factory Integration", () => {
  describe("All Agents Creation", () => {
    it("should create all agents with consistent structure", () => {
      const reviewer = createReviewAgent();
      const tester = createTesterAgent();
      const documenter = createDocumenterAgent();
      const planner = createPlannerAgent();
      const developer = createDeveloperAgent();
      const deployer = createDeployerAgent();
      const monitor = createMonitorAgent();
      const orchestrator = createOrchestrator();

      // All agents should have required base properties
      const agents = [
        reviewer,
        tester,
        documenter,
        planner,
        developer,
        deployer,
        monitor,
        orchestrator,
      ];

      for (const agent of agents) {
        expect(agent).toHaveProperty("name");
        expect(agent).toHaveProperty("role");
        expect(agent).toHaveProperty("status");
        expect(agent).toHaveProperty("version");
        expect(agent).toHaveProperty("capabilities");
        expect(agent.capabilities).toHaveProperty("canModifyFiles");
        expect(agent.capabilities).toHaveProperty("canExecuteCommands");
        expect(agent.capabilities).toHaveProperty("canAccessNetwork");
        expect(agent.capabilities).toHaveProperty("requiresHumanApproval");
      }
    });

    it("should have appropriate capability flags per agent role", () => {
      const reviewer = createReviewAgent();
      const tester = createTesterAgent();
      const planner = createPlannerAgent();
      const developer = createDeveloperAgent();
      const deployer = createDeployerAgent();
      const monitor = createMonitorAgent();

      // Reviewer is read-only
      expect(reviewer.capabilities.canModifyFiles).toBe(false);
      expect(reviewer.capabilities.requiresHumanApproval).toBe(true);

      // Tester creates test files
      expect(tester.capabilities.canModifyFiles).toBe(true);
      expect(tester.capabilities.requiresHumanApproval).toBe(false);

      // Planner is read-only analysis
      expect(planner.capabilities.canModifyFiles).toBe(false);
      expect(planner.capabilities.requiresHumanApproval).toBe(true);

      // Developer modifies code
      expect(developer.capabilities.canModifyFiles).toBe(true);
      expect(developer.capabilities.requiresHumanApproval).toBe(true);

      // Deployer can modify and execute
      expect(deployer.capabilities.canModifyFiles).toBe(true);
      expect(deployer.capabilities.canExecuteCommands).toBe(true);
      expect(deployer.capabilities.requiresHumanApproval).toBe(true);

      // Monitor is passive observation
      expect(monitor.capabilities.canModifyFiles).toBe(false);
      expect(monitor.capabilities.requiresHumanApproval).toBe(false);
    });
  });
});

describe("Agent Output Format Compatibility", () => {
  describe("Report Formatting", () => {
    it("should format reviewer output as valid markdown", () => {
      const reviewResult: ReviewResult = {
        summary: "approve",
        overview: "Well-structured code with good test coverage.",
        feedback: [
          {
            severity: "suggestion",
            file: "src/utils.ts",
            line: 42,
            message: "Consider using optional chaining here",
            suggestedFix: "Use obj?.prop instead of obj && obj.prop",
          },
        ],
        positives: ["Good error handling", "Clear naming conventions"],
        questions: [],
        requiresHumanReview: false,
      };

      const markdown = formatReviewAsMarkdown(reviewResult);

      expect(markdown).toContain("## Summary");
      expect(markdown).toContain("Approve");
      expect(markdown).toContain("## Overview");
      expect(markdown).toContain("## What I Liked");
      expect(markdown).toContain("Good error handling");
    });

    it("should format tester output as valid markdown", () => {
      const testReport: TestReport = {
        sourceFile: "src/calculator.ts",
        testFile: "src/calculator.test.ts",
        generatedAt: new Date().toISOString(),
        testCases: [
          {
            name: "should add two numbers",
            description: "Tests basic addition functionality",
            category: "unit",
            priority: "critical",
            targetFunction: "add",
            testCode: "expect(add(2, 3)).toBe(5);",
          },
        ],
        coverage: {
          lines: 85,
          branches: 80,
          functions: 90,
          statements: 85,
        },
        functionsWithoutTests: ["divide"],
        suggestions: ["Add edge case tests for zero division"],
        requiresHumanReview: false,
      };

      const markdown = formatTestReport(testReport);

      expect(markdown).toContain("# Test Generation Report");
      expect(markdown).toContain("**Source:** `src/calculator.ts`");
      expect(markdown).toContain("## Coverage");
      expect(markdown).toContain("## Test Cases");
      expect(markdown).toContain("## Functions Without Tests");
    });

    it("should format planner output as valid markdown", () => {
      const spec: TechnicalSpec = {
        title: "User Authentication Feature",
        summary: "Implement secure user authentication with OAuth2",
        generatedAt: new Date().toISOString(),
        prdSource: "docs/prd.md",
        requirements: [
          {
            id: "REQ-001",
            title: "User Login",
            description: "Users can log in with email/password",
            type: "functional",
            priority: "must_have",
          },
        ],
        architecture: {
          overview: "JWT-based authentication flow",
          files: [
            {
              path: "src/auth/service.ts",
              purpose: "Authentication service",
              exports: ["AuthService"],
              dependencies: ["jwt"],
              complexity: "moderate",
            },
          ],
          dataFlow: "User -> API -> AuthService -> TokenManager -> Response",
          integrationPoints: ["Database", "Token Store"],
        },
        tasks: [
          {
            id: "TASK-001",
            title: "Create AuthService",
            description: "Implement authentication service",
            category: "feature",
            complexity: "moderate",
            files: ["src/auth/service.ts"],
            dependencies: [],
            acceptanceCriteria: ["Service authenticates users"],
            blockedBy: [],
            order: 1,
          },
        ],
        risks: [
          {
            id: "RISK-001",
            title: "Token expiry handling",
            description: "Token expiry handling complexity",
            severity: "medium",
            category: "technical",
            mitigation: "Implement refresh token flow",
          },
        ],
        dependencies: [],
        estimatedComplexity: "moderate",
        openQuestions: [],
        requiresHumanReview: false,
      };

      const markdown = formatTechnicalSpec(spec);

      expect(markdown).toContain(
        "# Technical Specification: User Authentication Feature",
      );
      expect(markdown).toContain("## Requirements");
      expect(markdown).toContain("## Architecture");
      expect(markdown).toContain("## Implementation Tasks");
      expect(markdown).toContain("## Technical Risks");
    });

    it("should format developer output as valid markdown", () => {
      const generationResult: CodeGenerationResult = {
        title: "Logger Utility",
        summary: "Create a logger utility",
        generatedAt: new Date().toISOString(),
        specification: "docs/spec.md",
        files: [
          {
            path: "src/utils/logger.ts",
            content: "export const log = (msg: string) => console.log(msg);",
            type: "add",
            language: "typescript",
            description: "Logger utility module",
          },
        ],
        changes: [
          {
            id: "change-001",
            type: "add",
            file: "src/utils/logger.ts",
            description: "Created new logger utility",
            after: "export const log = (msg: string) => console.log(msg);",
            confidence: "high",
            rationale: "Standard logging pattern",
          },
        ],
        patterns: [],
        dependencies: [],
        testSuggestions: ["Test log output", "Test error handling"],
        confidence: "high",
        requiresHumanReview: false,
      };

      const markdown = formatGenerationResult(generationResult);

      expect(markdown).toContain("# Code Generation:");
      expect(markdown).toContain("## Generated Files");
      expect(markdown).toContain("## Code Changes");
      expect(markdown).toContain("## Test Suggestions");
    });

    it("should format deployer output as valid markdown", () => {
      const buildResult: BuildResult = {
        id: "build-001",
        status: "success",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 45000,
        steps: [
          {
            name: "Install dependencies",
            command: "npm install",
            status: "success",
            duration: 20000,
          },
          {
            name: "Build",
            command: "npm run build",
            status: "success",
            duration: 25000,
          },
        ],
        artifacts: [
          {
            name: "dist.zip",
            path: "dist/dist.zip",
            size: 1024000,
            checksum: "abc123",
            type: "archive",
          },
        ],
        commit: "abc123def",
        branch: "main",
      };

      const markdown = formatBuildResult(buildResult);

      expect(markdown).toContain("# Build Report");
      expect(markdown).toContain("**Status:**");
      expect(markdown).toContain("## Build Steps");
      expect(markdown).toContain("## Artifacts");
    });

    it("should format monitor output as valid markdown", () => {
      const metricsReport: MetricsReport = {
        reportId: "metrics-001",
        generatedAt: new Date().toISOString(),
        period: {
          start: new Date(Date.now() - 86400000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: {
          totalMetrics: 5,
          healthyChecks: 3,
          degradedChecks: 1,
          unhealthyChecks: 0,
          activeAlerts: 1,
        },
        healthChecks: [
          {
            name: "API Health",
            status: "healthy",
            lastChecked: new Date().toISOString(),
            message: "All endpoints responding",
          },
        ],
        alerts: [
          {
            id: "alert-001",
            severity: "warning",
            message: "Memory usage above 80%",
            triggeredAt: new Date().toISOString(),
            metric: "memory_usage",
            threshold: 80,
            currentValue: 85,
          },
        ],
        metrics: [
          {
            name: "request_count",
            type: "counter",
            value: 10000,
            unit: "requests",
          },
        ],
        trends: [],
      };

      const markdown = formatMetricsReport(metricsReport);

      expect(markdown).toContain("# Metrics Report");
      expect(markdown).toContain("## Summary");
      expect(markdown).toContain("## Health Checks");
      expect(markdown).toContain("## Active Alerts");
    });
  });
});

describe("Agent Handoff Chain", () => {
  describe("Planner -> Developer Handoff", () => {
    it("should pass technical spec from planner to developer", () => {
      const plannerOutput: TechnicalSpec = {
        title: "Feature X",
        summary: "Build feature X",
        generatedAt: new Date().toISOString(),
        prdSource: "prd.md",
        requirements: [
          {
            id: "REQ-001",
            title: "Feature X requirement",
            description: "User can do X",
            type: "functional",
            priority: "must_have",
          },
        ],
        architecture: {
          overview: "Simple service",
          files: [
            {
              path: "src/services/x.ts",
              purpose: "X service implementation",
              exports: ["XService"],
              dependencies: [],
              complexity: "simple",
            },
          ],
          integrationPoints: [],
        },
        tasks: [
          {
            id: "TASK-001",
            title: "Implement XService",
            description: "Create the service",
            category: "feature",
            complexity: "simple",
            files: ["src/services/x.ts"],
            dependencies: [],
            acceptanceCriteria: ["Service works"],
            blockedBy: [],
            order: 1,
          },
        ],
        risks: [],
        dependencies: [],
        estimatedComplexity: "simple",
        openQuestions: [],
        requiresHumanReview: false,
      };

      const handoff = createHandoffMessage(
        AgentName.PLANNER,
        AgentName.DEVELOPER,
        SDLCPhase.DEVELOPMENT,
        {
          spec: plannerOutput,
          currentTask: plannerOutput.tasks[0],
        },
        [
          {
            type: "spec",
            path: "docs/spec.md",
            content: formatTechnicalSpec(plannerOutput),
            createdBy: AgentName.PLANNER,
            createdAt: new Date().toISOString(),
          },
        ],
      );

      expect(handoff.from).toBe("planner");
      expect(handoff.to).toBe("developer");
      expect(handoff.context).toHaveProperty("spec");
      expect(handoff.context).toHaveProperty("currentTask");
      expect(handoff.artifacts).toHaveLength(1);
      expect(handoff.artifacts[0]?.type).toBe("spec");
    });
  });

  describe("Developer -> Tester Handoff", () => {
    it("should pass code files from developer to tester", () => {
      const developerOutput: CodeGenerationResult = {
        prompt: "Implement user service",
        generatedAt: new Date().toISOString(),
        files: [
          {
            path: "src/services/user.ts",
            content: "export class UserService { ... }",
            language: "typescript",
          },
        ],
        changes: [
          {
            type: "add",
            path: "src/services/user.ts",
            description: "Created UserService",
          },
        ],
        patterns: [
          {
            type: "design_pattern",
            name: "Service Pattern",
            location: "src/services/user.ts",
            confidence: "high",
          },
        ],
        dependencies: [],
        testSuggestions: [
          "Test user creation",
          "Test user retrieval",
          "Test validation errors",
        ],
      };

      const handoff = createHandoffMessage(
        AgentName.DEVELOPER,
        AgentName.TESTER,
        SDLCPhase.TESTING,
        {
          codeGeneration: developerOutput,
          filesToTest: developerOutput.files.map((f) => f.path),
          testSuggestions: developerOutput.testSuggestions,
        },
        developerOutput.files.map((f) => ({
          type: "code" as const,
          path: f.path,
          content: f.content,
          createdBy: AgentName.DEVELOPER,
          createdAt: new Date().toISOString(),
        })),
      );

      expect(handoff.from).toBe("developer");
      expect(handoff.to).toBe("tester");
      expect(handoff.context).toHaveProperty("filesToTest");
      expect(handoff.context).toHaveProperty("testSuggestions");
      expect(
        (handoff.context as Record<string, unknown>).testSuggestions,
      ).toHaveLength(3);
    });
  });

  describe("Tester -> Reviewer Handoff", () => {
    it("should pass test results from tester to reviewer", () => {
      const testerOutput: TestReport = {
        sourceFile: "src/services/user.ts",
        testFile: "src/services/user.test.ts",
        generatedAt: new Date().toISOString(),
        testCases: [
          {
            name: "should create user",
            description: "Tests user creation",
            category: "unit",
            priority: "critical",
            targetFunction: "createUser",
            testCode: "expect(createUser(data)).resolves.toBeDefined();",
          },
        ],
        coverage: {
          lines: 92,
          branches: 88,
          functions: 100,
          statements: 91,
        },
        functionsWithoutTests: [],
        suggestions: [],
        requiresHumanReview: false,
      };

      const handoff = createHandoffMessage(
        AgentName.TESTER,
        AgentName.REVIEWER,
        SDLCPhase.REVIEW,
        {
          testReport: testerOutput,
          coverage: testerOutput.coverage,
          allTestsPassing: true,
        },
        [
          {
            type: "test",
            path: testerOutput.testFile,
            createdBy: AgentName.TESTER,
            createdAt: new Date().toISOString(),
          },
          {
            type: "report",
            path: "coverage/lcov-report/index.html",
            createdBy: AgentName.TESTER,
            createdAt: new Date().toISOString(),
          },
        ],
      );

      expect(handoff.from).toBe("tester");
      expect(handoff.to).toBe("reviewer");
      expect(handoff.context).toHaveProperty("coverage");
      expect(handoff.context).toHaveProperty("allTestsPassing");
      expect(handoff.artifacts).toHaveLength(2);
    });
  });

  describe("Reviewer -> Deployer Handoff", () => {
    it("should pass approval from reviewer to deployer", () => {
      const reviewerOutput: ReviewResult = {
        summary: "approve",
        overview: "Code looks good, tests pass, ready for deployment.",
        feedback: [],
        positives: ["Clean code", "Good coverage", "Clear documentation"],
        questions: [],
        requiresHumanReview: false,
      };

      const handoff = createHandoffMessage(
        AgentName.REVIEWER,
        AgentName.DEPLOYER,
        SDLCPhase.DEPLOYMENT,
        {
          reviewResult: reviewerOutput,
          approved: true,
          reviewedFiles: ["src/services/user.ts", "src/services/user.test.ts"],
        },
        [
          {
            type: "report",
            path: "reviews/pr-123.md",
            content: formatReviewAsMarkdown(reviewerOutput),
            createdBy: AgentName.REVIEWER,
            createdAt: new Date().toISOString(),
          },
        ],
      );

      expect(handoff.from).toBe("reviewer");
      expect(handoff.to).toBe("deployer");
      expect(handoff.context).toHaveProperty("approved");
      expect((handoff.context as Record<string, boolean>).approved).toBe(true);
    });
  });

  describe("Deployer -> Monitor Handoff", () => {
    it("should pass deployment info from deployer to monitor", () => {
      const deployerOutput: DeploymentResult = {
        status: "success",
        environment: "production",
        deployedAt: new Date().toISOString(),
        version: "1.2.0",
        build: {
          id: "build-123",
          status: "success",
          artifacts: ["dist.zip"],
        },
        targets: [
          {
            name: "api-server",
            status: "success",
            url: "https://api.example.com",
            healthCheckPassed: true,
          },
        ],
        rollbackAvailable: true,
        previousVersion: "1.1.0",
      };

      const handoff = createHandoffMessage(
        AgentName.DEPLOYER,
        AgentName.MONITOR,
        SDLCPhase.MONITORING,
        {
          deployment: deployerOutput,
          version: deployerOutput.version,
          environment: deployerOutput.environment,
          endpoints: deployerOutput.targets.map((t) => t.url),
        },
        [
          {
            type: "release",
            path: "CHANGELOG.md",
            createdBy: AgentName.DEPLOYER,
            createdAt: new Date().toISOString(),
          },
        ],
      );

      expect(handoff.from).toBe("deployer");
      expect(handoff.to).toBe("monitor");
      expect(handoff.context).toHaveProperty("version");
      expect(handoff.context).toHaveProperty("endpoints");
    });
  });
});

describe("Error Handling Across Agents", () => {
  it("should handle planner failure gracefully", () => {
    // Planner fails to parse PRD
    const handoff = createHandoffMessage(
      "orchestrator",
      AgentName.PLANNER,
      SDLCPhase.PLANNING,
      {
        error: "Failed to parse PRD: invalid format",
        canRetry: true,
        suggestions: ["Check PRD format", "Ensure all required sections exist"],
      },
      [],
    );

    expect(handoff.context).toHaveProperty("error");
    expect(handoff.context).toHaveProperty("canRetry");
    expect((handoff.context as Record<string, boolean>).canRetry).toBe(true);
  });

  it("should handle test failure with retry context", () => {
    const testerFailure = createHandoffMessage(
      AgentName.TESTER,
      AgentName.DEVELOPER,
      SDLCPhase.DEVELOPMENT,
      {
        error: "5 tests failing",
        failingTests: [
          "should validate email format",
          "should reject invalid passwords",
          "should handle network errors",
        ],
        coverage: {
          lines: 45,
          branches: 30,
          functions: 50,
          statements: 45,
        },
        retryAttempt: 1,
        maxRetries: 3,
      },
      [],
    );

    expect(testerFailure.context).toHaveProperty("failingTests");
    expect(testerFailure.context).toHaveProperty("retryAttempt");
    expect(testerFailure.phase).toBe(SDLCPhase.DEVELOPMENT); // Goes back to dev
  });

  it("should handle deployment rollback scenario", () => {
    const deployerRollback = createHandoffMessage(
      AgentName.DEPLOYER,
      AgentName.MONITOR,
      SDLCPhase.MONITORING,
      {
        rollbackTriggered: true,
        reason: "Health check failed after deployment",
        rolledBackFrom: "1.2.0",
        rolledBackTo: "1.1.0",
        affectedServices: ["api-server"],
      },
      [],
    );

    expect(deployerRollback.context).toHaveProperty("rollbackTriggered");
    expect(
      (deployerRollback.context as Record<string, boolean>).rollbackTriggered,
    ).toBe(true);
  });
});
