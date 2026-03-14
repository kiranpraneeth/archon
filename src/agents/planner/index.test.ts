/**
 * Tests for the Planning Agent
 */

import { describe, it, expect } from "vitest";
import {
  createPlannerAgent,
  formatTechnicalSpec,
  RiskSeverity,
  Complexity,
  TaskCategory,
  TechnicalRiskSchema,
  DependencySchema,
  FileSpecSchema,
  TechnicalTaskSchema,
  RequirementSchema,
  TechnicalSpecSchema,
  type TechnicalSpec,
  type TechnicalRisk,
  type Dependency,
  type FileSpec,
  type TechnicalTask,
  type Requirement,
  type PlannerConfig,
} from "./index.js";

describe("Planning Agent", () => {
  describe("createPlannerAgent", () => {
    it("should create agent with default configuration", () => {
      const agent = createPlannerAgent();

      expect(agent.name).toBe("Planner");
      expect(agent.role).toBe("Planning Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createPlannerAgent();

      expect(agent.capabilities.canModifyFiles).toBe(false);
      expect(agent.capabilities.canExecuteCommands).toBe(false);
      expect(agent.capabilities.canAccessNetwork).toBe(false);
      expect(agent.capabilities.requiresHumanApproval).toBe(true);
    });

    it("should have default config values", () => {
      const agent = createPlannerAgent();

      expect(agent.config.includeTaskOrdering).toBe(true);
      expect(agent.config.includeRiskMitigation).toBe(true);
      expect(agent.config.analyzeDependencies).toBe(true);
      expect(agent.config.maxTasks).toBe(50);
      expect(agent.config.outputFormat).toBe("markdown");
    });

    it("should allow config overrides", () => {
      const customConfig: Partial<PlannerConfig> = {
        maxTasks: 100,
        outputFormat: "json",
        includeTaskOrdering: false,
      };

      const agent = createPlannerAgent(customConfig);

      expect(agent.config.maxTasks).toBe(100);
      expect(agent.config.outputFormat).toBe("json");
      expect(agent.config.includeTaskOrdering).toBe(false);
      // Defaults should still apply for non-overridden values
      expect(agent.config.includeRiskMitigation).toBe(true);
      expect(agent.config.analyzeDependencies).toBe(true);
    });

    it("should preserve partial overrides correctly", () => {
      const agent = createPlannerAgent({
        analyzeDependencies: false,
      });

      expect(agent.config.analyzeDependencies).toBe(false);
      expect(agent.config.includeTaskOrdering).toBe(true);
      expect(agent.config.includeRiskMitigation).toBe(true);
    });
  });

  describe("Type Constants", () => {
    it("should have correct RiskSeverity values", () => {
      expect(RiskSeverity.CRITICAL).toBe("critical");
      expect(RiskSeverity.HIGH).toBe("high");
      expect(RiskSeverity.MEDIUM).toBe("medium");
      expect(RiskSeverity.LOW).toBe("low");
    });

    it("should have correct Complexity values", () => {
      expect(Complexity.TRIVIAL).toBe("trivial");
      expect(Complexity.SIMPLE).toBe("simple");
      expect(Complexity.MODERATE).toBe("moderate");
      expect(Complexity.COMPLEX).toBe("complex");
      expect(Complexity.VERY_COMPLEX).toBe("very_complex");
    });

    it("should have correct TaskCategory values", () => {
      expect(TaskCategory.SETUP).toBe("setup");
      expect(TaskCategory.FEATURE).toBe("feature");
      expect(TaskCategory.INTEGRATION).toBe("integration");
      expect(TaskCategory.TESTING).toBe("testing");
      expect(TaskCategory.DOCUMENTATION).toBe("documentation");
      expect(TaskCategory.REFACTORING).toBe("refactoring");
      expect(TaskCategory.INFRASTRUCTURE).toBe("infrastructure");
    });
  });

  describe("Zod Schemas", () => {
    describe("TechnicalRiskSchema", () => {
      it("should validate a valid risk", () => {
        const risk: TechnicalRisk = {
          id: "RISK-001",
          title: "Database Migration",
          description: "Complex schema changes may cause downtime",
          severity: "high",
          category: "infrastructure",
          mitigation: "Use rolling migrations with backward compatibility",
        };

        const result = TechnicalRiskSchema.safeParse(risk);
        expect(result.success).toBe(true);
      });

      it("should accept optional acceptanceCriteria", () => {
        const risk: TechnicalRisk = {
          id: "RISK-002",
          title: "API Rate Limiting",
          description: "External API may rate limit our requests",
          severity: "medium",
          category: "external",
          mitigation: "Implement exponential backoff",
          acceptanceCriteria: "System handles rate limits gracefully",
        };

        const result = TechnicalRiskSchema.safeParse(risk);
        expect(result.success).toBe(true);
      });

      it("should reject invalid severity", () => {
        const invalidRisk = {
          id: "RISK-001",
          title: "Test",
          description: "Test",
          severity: "invalid",
          category: "test",
          mitigation: "Test",
        };

        const result = TechnicalRiskSchema.safeParse(invalidRisk);
        expect(result.success).toBe(false);
      });
    });

    describe("DependencySchema", () => {
      it("should validate a required external dependency", () => {
        const dep: Dependency = {
          name: "zod",
          type: "external",
          description: "Runtime schema validation",
          required: true,
          version: "^3.0.0",
        };

        const result = DependencySchema.safeParse(dep);
        expect(result.success).toBe(true);
      });

      it("should validate an optional dependency with alternative", () => {
        const dep: Dependency = {
          name: "redis",
          type: "service",
          description: "Caching layer",
          required: false,
          alternative: "In-memory cache",
        };

        const result = DependencySchema.safeParse(dep);
        expect(result.success).toBe(true);
      });

      it("should reject invalid type", () => {
        const invalidDep = {
          name: "test",
          type: "invalid",
          description: "Test",
          required: true,
        };

        const result = DependencySchema.safeParse(invalidDep);
        expect(result.success).toBe(false);
      });
    });

    describe("FileSpecSchema", () => {
      it("should validate a file spec", () => {
        const fileSpec: FileSpec = {
          path: "src/agents/planner/index.ts",
          purpose: "Planning Agent implementation",
          exports: ["createPlannerAgent", "formatTechnicalSpec"],
          dependencies: ["zod", "../../core/types.js"],
          complexity: "moderate",
        };

        const result = FileSpecSchema.safeParse(fileSpec);
        expect(result.success).toBe(true);
      });

      it("should accept optional notes", () => {
        const fileSpec: FileSpec = {
          path: "src/config.ts",
          purpose: "Configuration management",
          exports: ["loadConfig"],
          dependencies: [],
          complexity: "simple",
          notes: "Consider using environment variables",
        };

        const result = FileSpecSchema.safeParse(fileSpec);
        expect(result.success).toBe(true);
      });

      it("should reject invalid complexity", () => {
        const invalid = {
          path: "test.ts",
          purpose: "Test",
          exports: [],
          dependencies: [],
          complexity: "invalid",
        };

        const result = FileSpecSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("TechnicalTaskSchema", () => {
      it("should validate a complete task", () => {
        const task: TechnicalTask = {
          id: "TASK-001",
          title: "Create Planning Agent",
          description:
            "Implement the planning agent following existing patterns",
          category: "feature",
          complexity: "moderate",
          files: ["src/agents/planner/index.ts"],
          dependencies: ["zod"],
          acceptanceCriteria: [
            "Agent creates technical specs",
            "Tests pass with >80% coverage",
          ],
          blockedBy: [],
          order: 1,
        };

        const result = TechnicalTaskSchema.safeParse(task);
        expect(result.success).toBe(true);
      });

      it("should validate task with blockedBy references", () => {
        const task: TechnicalTask = {
          id: "TASK-002",
          title: "Add integration tests",
          description: "Create integration tests for planning workflow",
          category: "testing",
          complexity: "simple",
          files: ["tests/integration/planner.test.ts"],
          dependencies: [],
          acceptanceCriteria: ["Integration tests pass"],
          blockedBy: ["TASK-001"],
          order: 2,
        };

        const result = TechnicalTaskSchema.safeParse(task);
        expect(result.success).toBe(true);
      });

      it("should reject invalid category", () => {
        const invalid = {
          id: "TASK-001",
          title: "Test",
          description: "Test",
          category: "invalid",
          complexity: "simple",
          files: [],
          dependencies: [],
          acceptanceCriteria: [],
          blockedBy: [],
          order: 1,
        };

        const result = TechnicalTaskSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("RequirementSchema", () => {
      it("should validate functional requirement", () => {
        const req: Requirement = {
          id: "FR-001",
          title: "User Authentication",
          description: "Users can log in with email and password",
          type: "functional",
          priority: "must_have",
        };

        const result = RequirementSchema.safeParse(req);
        expect(result.success).toBe(true);
      });

      it("should validate non-functional requirement with source", () => {
        const req: Requirement = {
          id: "NFR-001",
          title: "Response Time",
          description: "API responses under 200ms",
          type: "non_functional",
          priority: "should_have",
          source: "PRD Section 3.2",
        };

        const result = RequirementSchema.safeParse(req);
        expect(result.success).toBe(true);
      });

      it("should validate constraint", () => {
        const req: Requirement = {
          id: "C-001",
          title: "Browser Support",
          description: "Must support Chrome, Firefox, Safari",
          type: "constraint",
          priority: "must_have",
        };

        const result = RequirementSchema.safeParse(req);
        expect(result.success).toBe(true);
      });

      it("should reject invalid priority", () => {
        const invalid = {
          id: "REQ-001",
          title: "Test",
          description: "Test",
          type: "functional",
          priority: "invalid",
        };

        const result = RequirementSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("TechnicalSpecSchema", () => {
      it("should validate a minimal spec", () => {
        const spec: TechnicalSpec = {
          title: "Feature X",
          summary: "Implement Feature X",
          generatedAt: "2026-03-13T12:00:00Z",
          prdSource: "docs/prd-feature-x.md",
          requirements: [],
          architecture: {
            overview: "Simple addition to existing module",
            files: [],
            integrationPoints: [],
          },
          tasks: [],
          risks: [],
          dependencies: [],
          estimatedComplexity: "simple",
          openQuestions: [],
          requiresHumanReview: false,
        };

        const result = TechnicalSpecSchema.safeParse(spec);
        expect(result.success).toBe(true);
      });

      it("should validate a fully populated spec", () => {
        const spec: TechnicalSpec = {
          title: "Planning Agent",
          summary: "Implement the planning agent for Archon",
          generatedAt: "2026-03-13T12:00:00Z",
          prdSource: "docs/PRD_AGENTIC_SDLC.md",
          requirements: [
            {
              id: "FR-1",
              title: "Parse PRD",
              description: "Parse markdown PRD documents",
              type: "functional",
              priority: "must_have",
            },
          ],
          architecture: {
            overview: "Follow existing agent pattern",
            files: [
              {
                path: "src/agents/planner/index.ts",
                purpose: "Main implementation",
                exports: ["createPlannerAgent"],
                dependencies: ["zod"],
                complexity: "moderate",
              },
            ],
            dataFlow: "PRD -> Parser -> Spec Generator -> Output",
            integrationPoints: ["Other agents via orchestrator"],
          },
          tasks: [
            {
              id: "T-001",
              title: "Create agent",
              description: "Implement planning agent",
              category: "feature",
              complexity: "moderate",
              files: ["src/agents/planner/index.ts"],
              dependencies: [],
              acceptanceCriteria: ["Agent works"],
              blockedBy: [],
              order: 1,
            },
          ],
          risks: [
            {
              id: "R-001",
              title: "Complexity",
              description: "PRD parsing is complex",
              severity: "medium",
              category: "technical",
              mitigation: "Start simple, iterate",
            },
          ],
          dependencies: [
            {
              name: "zod",
              type: "external",
              description: "Schema validation",
              required: true,
            },
          ],
          estimatedComplexity: "moderate",
          openQuestions: ["How to handle malformed PRDs?"],
          requiresHumanReview: true,
          humanReviewReason: "Architecture decisions need validation",
        };

        const result = TechnicalSpecSchema.safeParse(spec);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("formatTechnicalSpec", () => {
    const minimalSpec: TechnicalSpec = {
      title: "Test Feature",
      summary: "A test feature for formatting",
      generatedAt: "2026-03-13T12:00:00Z",
      prdSource: "test.md",
      requirements: [],
      architecture: {
        overview: "Simple architecture",
        files: [],
        integrationPoints: [],
      },
      tasks: [],
      risks: [],
      dependencies: [],
      estimatedComplexity: "simple",
      openQuestions: [],
      requiresHumanReview: false,
    };

    it("should format header correctly", () => {
      const output = formatTechnicalSpec(minimalSpec);

      expect(output).toContain("# Technical Specification: Test Feature");
      expect(output).toContain("**Generated:** 2026-03-13T12:00:00Z");
      expect(output).toContain("**PRD Source:** `test.md`");
      expect(output).toContain("**Overall Complexity:** Simple");
    });

    it("should include summary section", () => {
      const output = formatTechnicalSpec(minimalSpec);

      expect(output).toContain("## Summary");
      expect(output).toContain("A test feature for formatting");
    });

    it("should format requirements by priority", () => {
      const specWithReqs: TechnicalSpec = {
        ...minimalSpec,
        requirements: [
          {
            id: "FR-1",
            title: "Must Have Feature",
            description: "This is required",
            type: "functional",
            priority: "must_have",
          },
          {
            id: "FR-2",
            title: "Should Have Feature",
            description: "This is recommended",
            type: "non_functional",
            priority: "should_have",
          },
          {
            id: "FR-3",
            title: "Nice to Have Feature",
            description: "This is optional",
            type: "constraint",
            priority: "nice_to_have",
          },
        ],
      };

      const output = formatTechnicalSpec(specWithReqs);

      expect(output).toContain("## Requirements");
      expect(output).toContain("### Must Have");
      expect(output).toContain("### Should Have");
      expect(output).toContain("### Nice to Have");
      expect(output).toContain("**FR-1**: Must Have Feature");
      expect(output).toContain("**FR-2**: Should Have Feature");
      expect(output).toContain("**FR-3**: Nice to Have Feature");
    });

    it("should show requirement type icons", () => {
      const specWithReqs: TechnicalSpec = {
        ...minimalSpec,
        requirements: [
          {
            id: "FR-1",
            title: "Functional",
            description: "Test",
            type: "functional",
            priority: "must_have",
          },
          {
            id: "NFR-1",
            title: "Non-functional",
            description: "Test",
            type: "non_functional",
            priority: "must_have",
          },
          {
            id: "C-1",
            title: "Constraint",
            description: "Test",
            type: "constraint",
            priority: "must_have",
          },
        ],
      };

      const output = formatTechnicalSpec(specWithReqs);

      // Functional icon
      expect(output).toMatch(/⚙️.*FR-1/);
      // Non-functional icon
      expect(output).toMatch(/📊.*NFR-1/);
      // Constraint icon
      expect(output).toMatch(/🔒.*C-1/);
    });

    it("should format architecture section", () => {
      const specWithArch: TechnicalSpec = {
        ...minimalSpec,
        architecture: {
          overview: "Modular architecture with clear separation",
          files: [
            {
              path: "src/core/types.ts",
              purpose: "Type definitions",
              exports: ["Agent", "Config"],
              dependencies: [],
              complexity: "simple",
            },
            {
              path: "src/agents/planner/index.ts",
              purpose: "Planning agent",
              exports: ["createPlannerAgent"],
              dependencies: ["zod"],
              complexity: "moderate",
            },
          ],
          dataFlow: "Input -> Processing -> Output",
          integrationPoints: ["Database", "External API"],
        },
      };

      const output = formatTechnicalSpec(specWithArch);

      expect(output).toContain("## Architecture");
      expect(output).toContain("Modular architecture with clear separation");
      expect(output).toContain("### File Structure");
      expect(output).toContain("| Path | Purpose | Complexity |");
      expect(output).toContain("`src/core/types.ts`");
      expect(output).toContain("Simple");
      expect(output).toContain("`src/agents/planner/index.ts`");
      expect(output).toContain("Moderate");
      expect(output).toContain("### Data Flow");
      expect(output).toContain("Input -> Processing -> Output");
      expect(output).toContain("### Integration Points");
      expect(output).toContain("- Database");
      expect(output).toContain("- External API");
    });

    it("should format tasks in order", () => {
      const specWithTasks: TechnicalSpec = {
        ...minimalSpec,
        tasks: [
          {
            id: "T-003",
            title: "Third Task",
            description: "Task three",
            category: "testing",
            complexity: "simple",
            files: ["test.ts"],
            dependencies: [],
            acceptanceCriteria: ["Tests pass"],
            blockedBy: ["T-001", "T-002"],
            order: 3,
          },
          {
            id: "T-001",
            title: "First Task",
            description: "Task one",
            category: "setup",
            complexity: "trivial",
            files: ["setup.ts"],
            dependencies: [],
            acceptanceCriteria: ["Setup complete"],
            blockedBy: [],
            order: 1,
          },
          {
            id: "T-002",
            title: "Second Task",
            description: "Task two",
            category: "feature",
            complexity: "complex",
            files: ["feature.ts", "utils.ts"],
            dependencies: ["zod"],
            acceptanceCriteria: ["Feature works", "Tests pass"],
            blockedBy: ["T-001"],
            order: 2,
          },
        ],
      };

      const output = formatTechnicalSpec(specWithTasks);

      expect(output).toContain("## Implementation Tasks");

      // Check order (1 should come before 2, 2 before 3)
      const task1Pos = output.indexOf("### 1. First Task");
      const task2Pos = output.indexOf("### 2. Second Task");
      const task3Pos = output.indexOf("### 3. Third Task");
      expect(task1Pos).toBeLessThan(task2Pos);
      expect(task2Pos).toBeLessThan(task3Pos);

      // Check task details
      expect(output).toContain("**ID:** T-002");
      expect(output).toContain("**Category:** feature");
      expect(output).toContain("**Blocked by:** T-001, T-002");

      // Check acceptance criteria as checkboxes
      expect(output).toContain("- [ ] Feature works");
      expect(output).toContain("- [ ] Tests pass");

      // Check files listed
      expect(output).toContain("**Files:**");
      expect(output).toContain("- `feature.ts`");
    });

    it("should show complexity icons", () => {
      const specWithTasks: TechnicalSpec = {
        ...minimalSpec,
        tasks: [
          {
            id: "T-001",
            title: "Trivial",
            description: "Test",
            category: "setup",
            complexity: "trivial",
            files: [],
            dependencies: [],
            acceptanceCriteria: [],
            blockedBy: [],
            order: 1,
          },
          {
            id: "T-002",
            title: "Very Complex",
            description: "Test",
            category: "feature",
            complexity: "very_complex",
            files: [],
            dependencies: [],
            acceptanceCriteria: [],
            blockedBy: [],
            order: 2,
          },
        ],
      };

      const output = formatTechnicalSpec(specWithTasks);

      expect(output).toContain("⚪ Trivial");
      expect(output).toContain("🔴 Very Complex");
    });

    it("should format risks by severity", () => {
      const specWithRisks: TechnicalSpec = {
        ...minimalSpec,
        risks: [
          {
            id: "R-001",
            title: "Critical Risk",
            description: "This is critical",
            severity: "critical",
            category: "security",
            mitigation: "Address immediately",
          },
          {
            id: "R-002",
            title: "High Risk",
            description: "This is high priority",
            severity: "high",
            category: "technical",
            mitigation: "Plan for this",
          },
          {
            id: "R-003",
            title: "Medium Risk",
            description: "This is medium",
            severity: "medium",
            category: "process",
            mitigation: "Monitor closely",
          },
          {
            id: "R-004",
            title: "Low Risk",
            description: "This is low",
            severity: "low",
            category: "other",
            mitigation: "Note for future",
          },
        ],
      };

      const output = formatTechnicalSpec(specWithRisks);

      expect(output).toContain("## Technical Risks");
      expect(output).toContain("### 🔴 Critical Risks");
      expect(output).toContain("### 🟠 High Risks");
      expect(output).toContain("### 🟡 Medium Risks");
      expect(output).toContain("### 🟢 Low Risks");

      // Critical/High have detailed format
      expect(output).toContain("#### R-001: Critical Risk");
      expect(output).toContain("**Mitigation:** Address immediately");

      // Medium/Low have compact format
      expect(output).toContain("- **Medium Risk**: This is medium");
      expect(output).toContain("- Mitigation: Monitor closely");
    });

    it("should format dependencies", () => {
      const specWithDeps: TechnicalSpec = {
        ...minimalSpec,
        dependencies: [
          {
            name: "zod",
            type: "external",
            description: "Schema validation",
            required: true,
            version: "^3.0.0",
          },
          {
            name: "postgres",
            type: "service",
            description: "Database",
            required: true,
          },
          {
            name: "redis",
            type: "service",
            description: "Caching",
            required: false,
            alternative: "In-memory cache",
          },
        ],
      };

      const output = formatTechnicalSpec(specWithDeps);

      expect(output).toContain("## Dependencies");
      expect(output).toContain("### Required");
      expect(output).toContain(
        "**zod** (^3.0.0) (external): Schema validation",
      );
      expect(output).toContain("**postgres** (service): Database");
      expect(output).toContain("### Optional");
      expect(output).toContain(
        "**redis** (service): Caching Alternative: In-memory cache",
      );
    });

    it("should format open questions", () => {
      const specWithQuestions: TechnicalSpec = {
        ...minimalSpec,
        openQuestions: [
          "How to handle edge case X?",
          "What's the expected behavior for Y?",
          "Should we support Z?",
        ],
      };

      const output = formatTechnicalSpec(specWithQuestions);

      expect(output).toContain("## Open Questions");
      expect(output).toContain("- [ ] How to handle edge case X?");
      expect(output).toContain("- [ ] What's the expected behavior for Y?");
      expect(output).toContain("- [ ] Should we support Z?");
    });

    it("should show human review notice when required", () => {
      const specNeedsReview: TechnicalSpec = {
        ...minimalSpec,
        requiresHumanReview: true,
        humanReviewReason: "Complex architecture requires human validation",
      };

      const output = formatTechnicalSpec(specNeedsReview);

      expect(output).toContain("---");
      expect(output).toContain("⚠️ **Human review required**");
      expect(output).toContain(
        "Complex architecture requires human validation",
      );
    });

    it("should show default reason when humanReviewReason is missing", () => {
      const specNeedsReview: TechnicalSpec = {
        ...minimalSpec,
        requiresHumanReview: true,
      };

      const output = formatTechnicalSpec(specNeedsReview);

      expect(output).toContain("Architecture decisions need validation");
    });

    it("should not show human review notice when not required", () => {
      const output = formatTechnicalSpec(minimalSpec);

      expect(output).not.toContain("Human review required");
    });

    it("should handle empty sections gracefully", () => {
      const output = formatTechnicalSpec(minimalSpec);

      // Should not have empty section headers
      expect(output).not.toContain("### Must Have\n\n###");
      expect(output).not.toContain("## Implementation Tasks\n\n##");
      expect(output).not.toContain("## Technical Risks\n\n##");
      expect(output).not.toContain("## Dependencies\n\n##");
      expect(output).not.toContain("## Open Questions\n\n##");
    });

    it("should format all complexity levels correctly", () => {
      const complexities = [
        "trivial",
        "simple",
        "moderate",
        "complex",
        "very_complex",
      ] as const;

      for (const complexity of complexities) {
        const spec: TechnicalSpec = {
          ...minimalSpec,
          estimatedComplexity: complexity,
        };

        const output = formatTechnicalSpec(spec);
        const expectedLabel =
          complexity === "very_complex"
            ? "Very Complex"
            : complexity.charAt(0).toUpperCase() + complexity.slice(1);

        expect(output).toContain(`**Overall Complexity:** ${expectedLabel}`);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle spec with only architecture overview", () => {
      const spec: TechnicalSpec = {
        title: "Minimal Spec",
        summary: "Just an overview",
        generatedAt: "2026-03-13",
        prdSource: "min.md",
        requirements: [],
        architecture: {
          overview: "Very simple approach",
          files: [],
          integrationPoints: [],
        },
        tasks: [],
        risks: [],
        dependencies: [],
        estimatedComplexity: "trivial",
        openQuestions: [],
        requiresHumanReview: false,
      };

      const output = formatTechnicalSpec(spec);

      expect(output).toContain("## Architecture");
      expect(output).toContain("Very simple approach");
      expect(output).not.toContain("### File Structure");
      expect(output).not.toContain("### Data Flow");
      expect(output).not.toContain("### Integration Points");
    });

    it("should handle spec with architecture dataFlow but no files", () => {
      const spec: TechnicalSpec = {
        title: "Data Flow Only",
        summary: "Just data flow",
        generatedAt: "2026-03-13",
        prdSource: "flow.md",
        requirements: [],
        architecture: {
          overview: "Data flows through",
          files: [],
          dataFlow: "A -> B -> C",
          integrationPoints: [],
        },
        tasks: [],
        risks: [],
        dependencies: [],
        estimatedComplexity: "simple",
        openQuestions: [],
        requiresHumanReview: false,
      };

      const output = formatTechnicalSpec(spec);

      expect(output).toContain("### Data Flow");
      expect(output).toContain("A -> B -> C");
      expect(output).not.toContain("### File Structure");
    });

    it("should handle task with empty acceptance criteria", () => {
      const spec: TechnicalSpec = {
        title: "No Criteria",
        summary: "Task without criteria",
        generatedAt: "2026-03-13",
        prdSource: "nc.md",
        requirements: [],
        architecture: {
          overview: "Simple",
          files: [],
          integrationPoints: [],
        },
        tasks: [
          {
            id: "T-001",
            title: "Simple Task",
            description: "Just do it",
            category: "setup",
            complexity: "trivial",
            files: [],
            dependencies: [],
            acceptanceCriteria: [],
            blockedBy: [],
            order: 1,
          },
        ],
        risks: [],
        dependencies: [],
        estimatedComplexity: "trivial",
        openQuestions: [],
        requiresHumanReview: false,
      };

      const output = formatTechnicalSpec(spec);

      expect(output).toContain("### 1. Simple Task");
      expect(output).toContain("**Acceptance Criteria:**");
      // Should not crash with empty criteria
    });

    it("should handle dependency without version", () => {
      const spec: TechnicalSpec = {
        title: "No Version",
        summary: "Dep without version",
        generatedAt: "2026-03-13",
        prdSource: "nv.md",
        requirements: [],
        architecture: {
          overview: "Simple",
          files: [],
          integrationPoints: [],
        },
        tasks: [],
        risks: [],
        dependencies: [
          {
            name: "core-lib",
            type: "internal",
            description: "Internal library",
            required: true,
          },
        ],
        estimatedComplexity: "simple",
        openQuestions: [],
        requiresHumanReview: false,
      };

      const output = formatTechnicalSpec(spec);

      expect(output).toContain("**core-lib** (internal): Internal library");
      expect(output).not.toContain("undefined");
    });
  });
});
