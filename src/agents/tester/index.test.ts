import { describe, it, expect } from "vitest";

import {
  createTesterAgent,
  formatTestReport,
  TestPriority,
  TestCategory,
  TestCaseSchema,
  CoverageInfoSchema,
  TestReportSchema,
} from "./index.js";
import type { TestReport, TestCase, CoverageInfo } from "./index.js";

describe("createTesterAgent", () => {
  describe("when called with no config", () => {
    it("should return agent with default values", () => {
      const agent = createTesterAgent();

      expect(agent.name).toBe("Tester");
      expect(agent.role).toBe("Test Generation Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createTesterAgent();

      expect(agent.capabilities).toEqual({
        canModifyFiles: true,
        canExecuteCommands: true,
        canAccessNetwork: false,
        requiresHumanApproval: false,
      });
    });

    it("should have default config values", () => {
      const agent = createTesterAgent();

      expect(agent.config.targetCoverage).toBe(80);
      expect(agent.config.framework).toBe("vitest");
      expect(agent.config.includeUserJourneys).toBe(false);
      expect(agent.config.maxTestsPerFunction).toBe(10);
      expect(agent.config.excludePatterns).toContain("*.d.ts");
      expect(agent.config.excludePatterns).toContain("node_modules/**");
    });
  });

  describe("when called with config overrides", () => {
    it("should merge overrides with defaults", () => {
      const agent = createTesterAgent({
        targetCoverage: 90,
      });

      expect(agent.config.targetCoverage).toBe(90);
      expect(agent.config.framework).toBe("vitest"); // default preserved
    });

    it("should allow overriding all config options", () => {
      const customConfig = {
        targetCoverage: 95,
        framework: "jest" as const,
        includeUserJourneys: true,
        maxTestsPerFunction: 5,
        excludePatterns: ["custom/**"],
      };

      const agent = createTesterAgent(customConfig);

      expect(agent.config).toEqual(customConfig);
    });

    it("should not mutate default config", () => {
      const agent1 = createTesterAgent({ targetCoverage: 100 });
      const agent2 = createTesterAgent();

      expect(agent1.config.targetCoverage).toBe(100);
      expect(agent2.config.targetCoverage).toBe(80);
    });
  });
});

describe("formatTestReport", () => {
  const baseReport: TestReport = {
    sourceFile: "src/utils.ts",
    testFile: "src/utils.test.ts",
    generatedAt: "2024-01-15T10:00:00Z",
    testCases: [],
    functionsWithoutTests: [],
    suggestions: [],
    requiresHumanReview: false,
  };

  const sampleTestCase: TestCase = {
    name: "should return true for valid input",
    description: "Tests the happy path with valid data",
    category: "unit",
    priority: "critical",
    targetFunction: "validateInput",
    testCode: 'expect(validateInput("valid")).toBe(true)',
  };

  describe("header section", () => {
    it("should include report title", () => {
      const result = formatTestReport(baseReport);

      expect(result).toContain("# Test Generation Report");
    });

    it("should include source file path", () => {
      const result = formatTestReport(baseReport);

      expect(result).toContain("**Source:** `src/utils.ts`");
    });

    it("should include test file path", () => {
      const result = formatTestReport(baseReport);

      expect(result).toContain("**Test File:** `src/utils.test.ts`");
    });

    it("should include generation timestamp", () => {
      const result = formatTestReport(baseReport);

      expect(result).toContain("**Generated:** 2024-01-15T10:00:00Z");
    });
  });

  describe("summary section", () => {
    it("should show total test count", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [sampleTestCase, { ...sampleTestCase, name: "test2" }],
      });

      expect(result).toContain("**Total Tests:** 2");
    });

    it("should break down by priority", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [
          { ...sampleTestCase, priority: "critical" },
          { ...sampleTestCase, priority: "critical", name: "test2" },
          { ...sampleTestCase, priority: "important", name: "test3" },
          { ...sampleTestCase, priority: "optional", name: "test4" },
        ],
      });

      expect(result).toContain("Critical: 2");
      expect(result).toContain("Important: 1");
      expect(result).toContain("Optional: 1");
    });
  });

  describe("coverage section", () => {
    it("should display coverage metrics when provided", () => {
      const coverage: CoverageInfo = {
        lines: 85,
        branches: 75,
        functions: 90,
        statements: 88,
      };

      const result = formatTestReport({
        ...baseReport,
        coverage,
      });

      expect(result).toContain("## Coverage");
      expect(result).toContain("| Lines | 85% |");
      expect(result).toContain("| Branches | 75% |");
      expect(result).toContain("| Functions | 90% |");
      expect(result).toContain("| Statements | 88% |");
    });

    it("should omit coverage section when not provided", () => {
      const result = formatTestReport(baseReport);

      expect(result).not.toContain("## Coverage");
    });
  });

  describe("test cases section", () => {
    it("should group tests by category", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [
          { ...sampleTestCase, category: "unit" },
          { ...sampleTestCase, category: "integration", name: "int-test" },
        ],
      });

      expect(result).toContain("### Unit Tests");
      expect(result).toContain("### Integration Tests");
    });

    it("should show test name with priority icon", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [{ ...sampleTestCase, priority: "critical" }],
      });

      expect(result).toContain("- 🔴 **should return true for valid input**");
    });

    it("should use correct priority icons", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [
          { ...sampleTestCase, priority: "critical", name: "crit" },
          { ...sampleTestCase, priority: "important", name: "imp" },
          { ...sampleTestCase, priority: "optional", name: "opt" },
        ],
      });

      expect(result).toContain("🔴 **crit**");
      expect(result).toContain("🟡 **imp**");
      expect(result).toContain("🟢 **opt**");
    });

    it("should show target function", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [sampleTestCase],
      });

      expect(result).toContain("Target: `validateInput`");
    });

    it("should show test description", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [sampleTestCase],
      });

      expect(result).toContain("Tests the happy path with valid data");
    });

    it("should show mocks when provided", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [{ ...sampleTestCase, mocks: ["fetchData", "writeFile"] }],
      });

      expect(result).toContain("Mocks: fetchData, writeFile");
    });

    it("should not show mocks line when empty", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [{ ...sampleTestCase, mocks: [] }],
      });

      expect(result).not.toContain("Mocks:");
    });

    it("should handle all test categories", () => {
      const result = formatTestReport({
        ...baseReport,
        testCases: [
          { ...sampleTestCase, category: "unit", name: "u" },
          { ...sampleTestCase, category: "integration", name: "i" },
          { ...sampleTestCase, category: "e2e", name: "e" },
          { ...sampleTestCase, category: "user_journey", name: "uj" },
          { ...sampleTestCase, category: "acceptance", name: "a" },
        ],
      });

      expect(result).toContain("### Unit Tests");
      expect(result).toContain("### Integration Tests");
      expect(result).toContain("### End-to-End Tests");
      expect(result).toContain("### User Journey Tests");
      expect(result).toContain("### Acceptance Tests");
    });
  });

  describe("functions without tests section", () => {
    it("should list untested functions", () => {
      const result = formatTestReport({
        ...baseReport,
        functionsWithoutTests: ["helperFn", "utilityFn"],
      });

      expect(result).toContain("## Functions Without Tests");
      expect(result).toContain("- `helperFn`");
      expect(result).toContain("- `utilityFn`");
    });

    it("should omit section when all functions tested", () => {
      const result = formatTestReport({
        ...baseReport,
        functionsWithoutTests: [],
      });

      expect(result).not.toContain("## Functions Without Tests");
    });
  });

  describe("suggestions section", () => {
    it("should list suggestions", () => {
      const result = formatTestReport({
        ...baseReport,
        suggestions: [
          "Consider adding integration tests",
          "Mock external API calls",
        ],
      });

      expect(result).toContain("## Suggestions");
      expect(result).toContain("- Consider adding integration tests");
      expect(result).toContain("- Mock external API calls");
    });

    it("should omit section when no suggestions", () => {
      const result = formatTestReport({
        ...baseReport,
        suggestions: [],
      });

      expect(result).not.toContain("## Suggestions");
    });
  });

  describe("human review notice", () => {
    it("should show notice with custom reason", () => {
      const result = formatTestReport({
        ...baseReport,
        requiresHumanReview: true,
        humanReviewReason: "Complex business logic",
      });

      expect(result).toContain(
        "⚠️ **Human review required**: Complex business logic",
      );
    });

    it("should show default reason when not provided", () => {
      const result = formatTestReport({
        ...baseReport,
        requiresHumanReview: true,
      });

      expect(result).toContain(
        "⚠️ **Human review required**: See suggestions above",
      );
    });

    it("should not show notice when not required", () => {
      const result = formatTestReport({
        ...baseReport,
        requiresHumanReview: false,
      });

      expect(result).not.toContain("Human review required");
    });
  });

  describe("edge cases", () => {
    it("should handle empty report", () => {
      const result = formatTestReport(baseReport);

      expect(result).toContain("# Test Generation Report");
      expect(result).toContain("**Total Tests:** 0");
      expect(result).not.toContain("## Test Cases");
    });

    it("should handle report with all sections populated", () => {
      const fullReport: TestReport = {
        sourceFile: "src/complex.ts",
        testFile: "src/complex.test.ts",
        generatedAt: "2024-01-15T10:00:00Z",
        testCases: [
          {
            name: "critical test",
            description: "Tests critical path",
            category: "unit",
            priority: "critical",
            targetFunction: "mainFn",
            testCode: "expect(true).toBe(true)",
            mocks: ["db", "api"],
          },
          {
            name: "optional test",
            description: "Tests edge case",
            category: "integration",
            priority: "optional",
            targetFunction: "helperFn",
            testCode: "expect(1).toBe(1)",
          },
        ],
        coverage: {
          lines: 85,
          branches: 80,
          functions: 90,
          statements: 87,
        },
        functionsWithoutTests: ["unusedFn"],
        suggestions: ["Add more edge cases"],
        requiresHumanReview: true,
        humanReviewReason: "Complex async behavior",
      };

      const result = formatTestReport(fullReport);

      expect(result).toContain("# Test Generation Report");
      expect(result).toContain("**Total Tests:** 2");
      expect(result).toContain("## Coverage");
      expect(result).toContain("### Unit Tests");
      expect(result).toContain("### Integration Tests");
      expect(result).toContain("## Functions Without Tests");
      expect(result).toContain("## Suggestions");
      expect(result).toContain("Complex async behavior");
    });
  });
});

describe("Type constants", () => {
  describe("TestPriority", () => {
    it("should have correct values", () => {
      expect(TestPriority.CRITICAL).toBe("critical");
      expect(TestPriority.IMPORTANT).toBe("important");
      expect(TestPriority.OPTIONAL).toBe("optional");
    });
  });

  describe("TestCategory", () => {
    it("should have correct values", () => {
      expect(TestCategory.UNIT).toBe("unit");
      expect(TestCategory.INTEGRATION).toBe("integration");
      expect(TestCategory.E2E).toBe("e2e");
      expect(TestCategory.USER_JOURNEY).toBe("user_journey");
      expect(TestCategory.ACCEPTANCE).toBe("acceptance");
    });
  });
});

describe("Zod schemas", () => {
  describe("TestCaseSchema", () => {
    it("should validate correct test case", () => {
      const validCase = {
        name: "test",
        description: "desc",
        category: "unit",
        priority: "critical",
        targetFunction: "fn",
        testCode: "code",
      };

      const result = TestCaseSchema.safeParse(validCase);
      expect(result.success).toBe(true);
    });

    it("should accept optional mocks", () => {
      const caseWithMocks = {
        name: "test",
        description: "desc",
        category: "unit",
        priority: "critical",
        targetFunction: "fn",
        testCode: "code",
        mocks: ["mock1", "mock2"],
      };

      const result = TestCaseSchema.safeParse(caseWithMocks);
      expect(result.success).toBe(true);
    });

    it("should reject invalid category", () => {
      const invalidCase = {
        name: "test",
        description: "desc",
        category: "invalid",
        priority: "critical",
        targetFunction: "fn",
        testCode: "code",
      };

      const result = TestCaseSchema.safeParse(invalidCase);
      expect(result.success).toBe(false);
    });

    it("should reject invalid priority", () => {
      const invalidCase = {
        name: "test",
        description: "desc",
        category: "unit",
        priority: "invalid",
        targetFunction: "fn",
        testCode: "code",
      };

      const result = TestCaseSchema.safeParse(invalidCase);
      expect(result.success).toBe(false);
    });
  });

  describe("CoverageInfoSchema", () => {
    it("should validate correct coverage info", () => {
      const valid = {
        lines: 85,
        branches: 80,
        functions: 90,
        statements: 87,
      };

      const result = CoverageInfoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject coverage above 100", () => {
      const invalid = {
        lines: 101,
        branches: 80,
        functions: 90,
        statements: 87,
      };

      const result = CoverageInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject negative coverage", () => {
      const invalid = {
        lines: -1,
        branches: 80,
        functions: 90,
        statements: 87,
      };

      const result = CoverageInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("TestReportSchema", () => {
    it("should validate correct test report", () => {
      const validReport = {
        sourceFile: "src/test.ts",
        testFile: "src/test.test.ts",
        generatedAt: "2024-01-15T10:00:00Z",
        testCases: [],
        functionsWithoutTests: [],
        suggestions: [],
        requiresHumanReview: false,
      };

      const result = TestReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it("should accept optional coverage", () => {
      const reportWithCoverage = {
        sourceFile: "src/test.ts",
        testFile: "src/test.test.ts",
        generatedAt: "2024-01-15T10:00:00Z",
        testCases: [],
        coverage: {
          lines: 80,
          branches: 70,
          functions: 90,
          statements: 85,
        },
        functionsWithoutTests: [],
        suggestions: [],
        requiresHumanReview: false,
      };

      const result = TestReportSchema.safeParse(reportWithCoverage);
      expect(result.success).toBe(true);
    });

    it("should accept optional humanReviewReason", () => {
      const reportWithReason = {
        sourceFile: "src/test.ts",
        testFile: "src/test.test.ts",
        generatedAt: "2024-01-15T10:00:00Z",
        testCases: [],
        functionsWithoutTests: [],
        suggestions: [],
        requiresHumanReview: true,
        humanReviewReason: "Complex logic",
      };

      const result = TestReportSchema.safeParse(reportWithReason);
      expect(result.success).toBe(true);
    });
  });
});
