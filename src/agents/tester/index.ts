/**
 * Test Generation Agent — Archon
 *
 * This agent generates comprehensive, maintainable tests for TypeScript/Vitest projects.
 * It follows the test philosophy defined in .claude/agents/tester/CLAUDE.md
 *
 * The agent emphasizes behavior-driven tests, proper isolation through mocking,
 * and thorough edge case coverage.
 *
 * Note: The actual test generation logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../../core/types.js";

/**
 * Test case severity/priority levels.
 *
 * - CRITICAL: Must-have tests (happy path, security)
 * - IMPORTANT: Should-have tests (edge cases, error handling)
 * - OPTIONAL: Nice-to-have tests (minor variations, style)
 */
export const TestPriority = {
  CRITICAL: "critical",
  IMPORTANT: "important",
  OPTIONAL: "optional",
} as const;

export type TestPriority = (typeof TestPriority)[keyof typeof TestPriority];

/**
 * Categories of tests that can be generated.
 */
export const TestCategory = {
  UNIT: "unit",
  INTEGRATION: "integration",
  E2E: "e2e",
  USER_JOURNEY: "user_journey",
  ACCEPTANCE: "acceptance",
} as const;

export type TestCategory = (typeof TestCategory)[keyof typeof TestCategory];

/**
 * Represents a single generated test case.
 */
export const TestCaseSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum([
    "unit",
    "integration",
    "e2e",
    "user_journey",
    "acceptance",
  ]),
  priority: z.enum(["critical", "important", "optional"]),
  targetFunction: z.string(),
  testCode: z.string(),
  mocks: z.array(z.string()).optional(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * Coverage information for a test run.
 */
export const CoverageInfoSchema = z.object({
  lines: z.number().min(0).max(100),
  branches: z.number().min(0).max(100),
  functions: z.number().min(0).max(100),
  statements: z.number().min(0).max(100),
});

export type CoverageInfo = z.infer<typeof CoverageInfoSchema>;

/**
 * Complete test generation report.
 */
export const TestReportSchema = z.object({
  sourceFile: z.string(),
  testFile: z.string(),
  generatedAt: z.string(),
  testCases: z.array(TestCaseSchema),
  coverage: CoverageInfoSchema.optional(),
  functionsWithoutTests: z.array(z.string()),
  suggestions: z.array(z.string()),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

export type TestReport = z.infer<typeof TestReportSchema>;

/**
 * Test Generation Agent configuration
 */
export type TesterConfig = {
  /** Target coverage percentage */
  targetCoverage: number;
  /** Test framework to use */
  framework: "vitest" | "jest" | "mocha";
  /** Include user journey tests */
  includeUserJourneys: boolean;
  /** Maximum tests per function */
  maxTestsPerFunction: number;
  /** File patterns to skip */
  excludePatterns: string[];
};

/** Default configuration for the Test Generation Agent */
const DEFAULT_CONFIG: TesterConfig = {
  targetCoverage: 80,
  framework: "vitest",
  includeUserJourneys: false,
  maxTestsPerFunction: 10,
  excludePatterns: [
    "*.d.ts",
    "*.config.*",
    "*.test.*",
    "*.spec.*",
    "node_modules/**",
    "dist/**",
  ],
};

/**
 * Test Generation Agent definition
 */
export type TesterAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: TesterConfig;
};

/**
 * Create a Test Generation Agent instance
 */
export function createTesterAgent(
  configOverrides: Partial<TesterConfig> = {},
): TesterAgent {
  const config: TesterConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Tester",
    role: "Test Generation Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: true, // Creates test files
      canExecuteCommands: true, // Runs test commands
      canAccessNetwork: false, // No external access needed
      requiresHumanApproval: false, // Tests are safe to auto-generate
    },
    config,
  };
}

/**
 * Format a test report as markdown
 *
 * This is used when outputting test generation results in a human-readable format.
 */
export function formatTestReport(report: TestReport): string {
  const lines: string[] = [
    "# Test Generation Report",
    "",
    `**Source:** \`${report.sourceFile}\``,
    `**Test File:** \`${report.testFile}\``,
    `**Generated:** ${report.generatedAt}`,
    "",
  ];

  // Summary
  const criticalTests = report.testCases.filter(
    (t) => t.priority === "critical",
  );
  const importantTests = report.testCases.filter(
    (t) => t.priority === "important",
  );
  const optionalTests = report.testCases.filter(
    (t) => t.priority === "optional",
  );

  lines.push("## Summary", "");
  lines.push(`- **Total Tests:** ${report.testCases.length}`);
  lines.push(`  - Critical: ${criticalTests.length}`);
  lines.push(`  - Important: ${importantTests.length}`);
  lines.push(`  - Optional: ${optionalTests.length}`);
  lines.push("");

  // Coverage
  if (report.coverage) {
    lines.push("## Coverage", "");
    lines.push(`| Metric | Coverage |`);
    lines.push(`|--------|----------|`);
    lines.push(`| Lines | ${report.coverage.lines}% |`);
    lines.push(`| Branches | ${report.coverage.branches}% |`);
    lines.push(`| Functions | ${report.coverage.functions}% |`);
    lines.push(`| Statements | ${report.coverage.statements}% |`);
    lines.push("");
  }

  // Test Cases by Category
  const byCategory = new Map<string, TestCase[]>();
  for (const test of report.testCases) {
    const existing = byCategory.get(test.category) ?? [];
    existing.push(test);
    byCategory.set(test.category, existing);
  }

  if (byCategory.size > 0) {
    lines.push("## Test Cases", "");

    const categoryLabels: Record<string, string> = {
      unit: "Unit Tests",
      integration: "Integration Tests",
      e2e: "End-to-End Tests",
      user_journey: "User Journey Tests",
      acceptance: "Acceptance Tests",
    };

    for (const [category, tests] of byCategory) {
      lines.push(`### ${categoryLabels[category] ?? category}`, "");
      for (const test of tests) {
        const priorityIcon =
          test.priority === "critical"
            ? "🔴"
            : test.priority === "important"
              ? "🟡"
              : "🟢";
        lines.push(`- ${priorityIcon} **${test.name}**`);
        lines.push(`  - Target: \`${test.targetFunction}\``);
        lines.push(`  - ${test.description}`);
        if (test.mocks && test.mocks.length > 0) {
          lines.push(`  - Mocks: ${test.mocks.join(", ")}`);
        }
      }
      lines.push("");
    }
  }

  // Functions without tests
  if (report.functionsWithoutTests.length > 0) {
    lines.push("## Functions Without Tests", "");
    lines.push("The following functions were not tested:", "");
    for (const fn of report.functionsWithoutTests) {
      lines.push(`- \`${fn}\``);
    }
    lines.push("");
  }

  // Suggestions
  if (report.suggestions.length > 0) {
    lines.push("## Suggestions", "");
    for (const suggestion of report.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push("");
  }

  // Human review notice
  if (report.requiresHumanReview) {
    lines.push("---");
    lines.push(
      "⚠️ **Human review required**: " +
        (report.humanReviewReason ?? "See suggestions above"),
    );
  }

  return lines.join("\n");
}
