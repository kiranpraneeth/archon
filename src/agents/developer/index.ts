/**
 * Development Agent — Archon
 *
 * This agent assists with code generation, pattern detection, and refactoring.
 * It analyzes code structure, suggests improvements, and can generate
 * implementation code based on specifications.
 *
 * The agent follows the development philosophy defined in .claude/agents/developer/CLAUDE.md
 *
 * Note: The actual development logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../../core/types.js";

/**
 * Code change types for generated code.
 *
 * - ADD: New file or code block
 * - MODIFY: Changes to existing code
 * - DELETE: Remove code or file
 * - REFACTOR: Restructure without changing behavior
 */
export const ChangeType = {
  ADD: "add",
  MODIFY: "modify",
  DELETE: "delete",
  REFACTOR: "refactor",
} as const;

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

/**
 * Confidence levels for generated code.
 *
 * - HIGH: Confident implementation, follows clear patterns
 * - MEDIUM: Reasonable implementation, may need review
 * - LOW: Uncertain, multiple approaches possible
 */
export const Confidence = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type Confidence = (typeof Confidence)[keyof typeof Confidence];

/**
 * Pattern types that can be detected in code.
 */
export const PatternType = {
  DESIGN_PATTERN: "design_pattern",
  ANTI_PATTERN: "anti_pattern",
  CODE_SMELL: "code_smell",
  BEST_PRACTICE: "best_practice",
  CONVENTION: "convention",
} as const;

export type PatternType = (typeof PatternType)[keyof typeof PatternType];

/**
 * Refactoring operation types.
 */
export const RefactoringType = {
  EXTRACT_FUNCTION: "extract_function",
  EXTRACT_VARIABLE: "extract_variable",
  INLINE: "inline",
  RENAME: "rename",
  MOVE: "move",
  SIMPLIFY: "simplify",
  DECOMPOSE: "decompose",
} as const;

export type RefactoringType =
  (typeof RefactoringType)[keyof typeof RefactoringType];

/**
 * Represents a code change to be applied.
 */
export const CodeChangeSchema = z.object({
  id: z.string(),
  type: z.enum(["add", "modify", "delete", "refactor"]),
  file: z.string(),
  description: z.string(),
  before: z.string().optional(),
  after: z.string(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  rationale: z.string(),
});

export type CodeChange = z.infer<typeof CodeChangeSchema>;

/**
 * Represents a detected code pattern.
 */
export const DetectedPatternSchema = z.object({
  id: z.string(),
  type: z.enum([
    "design_pattern",
    "anti_pattern",
    "code_smell",
    "best_practice",
    "convention",
  ]),
  name: z.string(),
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  description: z.string(),
  recommendation: z.string().optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
});

export type DetectedPattern = z.infer<typeof DetectedPatternSchema>;

/**
 * Represents a suggested refactoring operation.
 */
export const RefactoringSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "extract_function",
    "extract_variable",
    "inline",
    "rename",
    "move",
    "simplify",
    "decompose",
  ]),
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  description: z.string(),
  benefit: z.string(),
  effort: z.enum(["trivial", "small", "medium", "large"]),
  before: z.string().optional(),
  after: z.string().optional(),
});

export type RefactoringSuggestion = z.infer<typeof RefactoringSuggestionSchema>;

/**
 * Represents a file to be generated or modified.
 */
export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  type: z.enum(["add", "modify", "delete"]),
  language: z.string(),
  description: z.string(),
});

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;

/**
 * Complete code generation result.
 */
export const CodeGenerationResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  generatedAt: z.string(),
  specification: z.string(),
  files: z.array(GeneratedFileSchema),
  changes: z.array(CodeChangeSchema),
  patterns: z.array(DetectedPatternSchema),
  dependencies: z.array(z.string()),
  testSuggestions: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

export type CodeGenerationResult = z.infer<typeof CodeGenerationResultSchema>;

/**
 * Code analysis result for pattern detection.
 */
export const CodeAnalysisResultSchema = z.object({
  file: z.string(),
  analyzedAt: z.string(),
  linesAnalyzed: z.number(),
  patterns: z.array(DetectedPatternSchema),
  refactorings: z.array(RefactoringSuggestionSchema),
  complexity: z.object({
    cyclomatic: z.number().optional(),
    cognitive: z.number().optional(),
    linesOfCode: z.number(),
    functions: z.number(),
    classes: z.number(),
  }),
  recommendations: z.array(z.string()),
});

export type CodeAnalysisResult = z.infer<typeof CodeAnalysisResultSchema>;

/**
 * Development Agent configuration
 */
export type DeveloperConfig = {
  /** Generate test suggestions for code */
  includeTestSuggestions: boolean;
  /** Detect and report code patterns */
  detectPatterns: boolean;
  /** Suggest refactoring opportunities */
  suggestRefactorings: boolean;
  /** Include code complexity metrics */
  analyzeComplexity: boolean;
  /** Languages to support */
  languages: string[];
  /** Maximum file size to analyze (in lines) */
  maxFileLines: number;
  /** Output format */
  outputFormat: "markdown" | "json";
};

/** Default configuration for the Development Agent */
const DEFAULT_CONFIG: DeveloperConfig = {
  includeTestSuggestions: true,
  detectPatterns: true,
  suggestRefactorings: true,
  analyzeComplexity: true,
  languages: ["typescript", "javascript"],
  maxFileLines: 2000,
  outputFormat: "markdown",
};

/**
 * Development Agent definition
 */
export type DeveloperAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: DeveloperConfig;
};

/**
 * Create a Development Agent instance
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns A configured DeveloperAgent instance
 *
 * @example
 * // Create with defaults
 * const agent = createDeveloperAgent();
 *
 * @example
 * // Support additional languages
 * const agent = createDeveloperAgent({ languages: ['typescript', 'python'] });
 */
export function createDeveloperAgent(
  configOverrides: Partial<DeveloperConfig> = {},
): DeveloperAgent {
  const config: DeveloperConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Developer",
    role: "Development Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: true, // Can generate/modify code
      canExecuteCommands: true, // May run build tools
      canAccessNetwork: false, // No external access needed
      requiresHumanApproval: true, // Code changes need review
    },
    config,
  };
}

/**
 * Format a code generation result as markdown
 *
 * @param result - The code generation result to format
 * @returns Markdown-formatted result string
 */
export function formatGenerationResult(result: CodeGenerationResult): string {
  const lines: string[] = [
    `# Code Generation: ${result.title}`,
    "",
    `**Generated:** ${result.generatedAt}`,
    `**Specification:** \`${result.specification}\``,
    `**Overall Confidence:** ${getConfidenceLabel(result.confidence)}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
  ];

  // Generated Files
  if (result.files.length > 0) {
    lines.push("## Generated Files", "");
    lines.push("| Path | Type | Language | Description |");
    lines.push("|------|------|----------|-------------|");
    for (const file of result.files) {
      const typeIcon = getChangeTypeIcon(file.type);
      lines.push(
        `| \`${file.path}\` | ${typeIcon} ${file.type} | ${file.language} | ${file.description} |`,
      );
    }
    lines.push("");

    // File contents
    lines.push("### File Contents", "");
    for (const file of result.files) {
      lines.push(`#### \`${file.path}\``, "");
      lines.push("```" + file.language);
      lines.push(file.content);
      lines.push("```", "");
    }
  }

  // Code Changes
  if (result.changes.length > 0) {
    lines.push("## Code Changes", "");
    for (const change of result.changes) {
      const icon = getChangeTypeIcon(change.type);
      const confIcon = getConfidenceIcon(change.confidence);
      lines.push(`### ${icon} ${change.description}`);
      lines.push("");
      lines.push(`**File:** \`${change.file}\``);
      if (change.startLine && change.endLine) {
        lines.push(`**Lines:** ${change.startLine}-${change.endLine}`);
      }
      lines.push(`**Confidence:** ${confIcon} ${change.confidence}`);
      lines.push("");
      lines.push(`**Rationale:** ${change.rationale}`);
      lines.push("");

      if (change.before) {
        lines.push("**Before:**");
        lines.push("```");
        lines.push(change.before);
        lines.push("```", "");
      }

      lines.push("**After:**");
      lines.push("```");
      lines.push(change.after);
      lines.push("```", "");
    }
  }

  // Detected Patterns
  if (result.patterns.length > 0) {
    lines.push("## Detected Patterns", "");

    const designPatterns = result.patterns.filter(
      (p) => p.type === "design_pattern" || p.type === "best_practice",
    );
    const issues = result.patterns.filter(
      (p) =>
        p.type === "anti_pattern" ||
        p.type === "code_smell" ||
        p.type === "convention",
    );

    if (designPatterns.length > 0) {
      lines.push("### Good Patterns", "");
      for (const pattern of designPatterns) {
        lines.push(
          `- **${pattern.name}** in \`${pattern.file}:${pattern.startLine}\``,
        );
        lines.push(`  - ${pattern.description}`);
      }
      lines.push("");
    }

    if (issues.length > 0) {
      lines.push("### Issues to Address", "");
      for (const pattern of issues) {
        const icon = getSeverityIcon(pattern.severity);
        lines.push(
          `- ${icon} **${pattern.name}** in \`${pattern.file}:${pattern.startLine}\``,
        );
        lines.push(`  - ${pattern.description}`);
        if (pattern.recommendation) {
          lines.push(`  - Recommendation: ${pattern.recommendation}`);
        }
      }
      lines.push("");
    }
  }

  // Dependencies
  if (result.dependencies.length > 0) {
    lines.push("## Dependencies", "");
    for (const dep of result.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push("");
  }

  // Test Suggestions
  if (result.testSuggestions.length > 0) {
    lines.push("## Test Suggestions", "");
    for (const suggestion of result.testSuggestions) {
      lines.push(`- [ ] ${suggestion}`);
    }
    lines.push("");
  }

  // Human review notice
  if (result.requiresHumanReview) {
    lines.push("---");
    lines.push(
      "**Human review required**: " +
        (result.humanReviewReason ?? "Code changes need validation"),
    );
  }

  return lines.join("\n");
}

/**
 * Format a code analysis result as markdown
 *
 * @param result - The code analysis result to format
 * @returns Markdown-formatted result string
 */
export function formatAnalysisResult(result: CodeAnalysisResult): string {
  const lines: string[] = [
    `# Code Analysis: \`${result.file}\``,
    "",
    `**Analyzed:** ${result.analyzedAt}`,
    `**Lines:** ${result.linesAnalyzed}`,
    "",
  ];

  // Complexity Metrics
  lines.push("## Complexity Metrics", "");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Lines of Code | ${result.complexity.linesOfCode} |`);
  lines.push(`| Functions | ${result.complexity.functions} |`);
  lines.push(`| Classes | ${result.complexity.classes} |`);
  if (result.complexity.cyclomatic !== undefined) {
    lines.push(`| Cyclomatic Complexity | ${result.complexity.cyclomatic} |`);
  }
  if (result.complexity.cognitive !== undefined) {
    lines.push(`| Cognitive Complexity | ${result.complexity.cognitive} |`);
  }
  lines.push("");

  // Detected Patterns
  if (result.patterns.length > 0) {
    lines.push("## Detected Patterns", "");
    for (const pattern of result.patterns) {
      const icon = getPatternTypeIcon(pattern.type);
      const severityIcon = getSeverityIcon(pattern.severity);
      lines.push(
        `### ${icon} ${pattern.name} ${severityIcon ? `(${severityIcon})` : ""}`,
      );
      lines.push("");
      lines.push(`**Location:** Lines ${pattern.startLine}-${pattern.endLine}`);
      lines.push("");
      lines.push(pattern.description);
      if (pattern.recommendation) {
        lines.push("");
        lines.push(`**Recommendation:** ${pattern.recommendation}`);
      }
      lines.push("");
    }
  }

  // Refactoring Suggestions
  if (result.refactorings.length > 0) {
    lines.push("## Refactoring Opportunities", "");

    // Group by effort
    const byEffort = {
      trivial: result.refactorings.filter((r) => r.effort === "trivial"),
      small: result.refactorings.filter((r) => r.effort === "small"),
      medium: result.refactorings.filter((r) => r.effort === "medium"),
      large: result.refactorings.filter((r) => r.effort === "large"),
    };

    for (const [effort, refactorings] of Object.entries(byEffort)) {
      if (refactorings.length === 0) continue;

      const effortLabel = effort.charAt(0).toUpperCase() + effort.slice(1);
      lines.push(`### ${effortLabel} Effort`, "");

      for (const refactoring of refactorings) {
        const icon = getRefactoringTypeIcon(refactoring.type);
        lines.push(
          `#### ${icon} ${refactoring.description} (lines ${refactoring.startLine}-${refactoring.endLine})`,
        );
        lines.push("");
        lines.push(`**Benefit:** ${refactoring.benefit}`);
        lines.push("");

        if (refactoring.before) {
          lines.push("**Before:**");
          lines.push("```");
          lines.push(refactoring.before);
          lines.push("```", "");
        }

        if (refactoring.after) {
          lines.push("**After:**");
          lines.push("```");
          lines.push(refactoring.after);
          lines.push("```", "");
        }
      }
    }
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push("## Recommendations", "");
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get a human-readable label for confidence level
 */
function getConfidenceLabel(confidence: Confidence | string): string {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return confidence;
  }
}

/**
 * Get an icon for confidence level
 */
function getConfidenceIcon(confidence: Confidence | string): string {
  switch (confidence) {
    case "high":
      return "+++";
    case "medium":
      return "++";
    case "low":
      return "+";
    default:
      return "";
  }
}

/**
 * Get an icon for change type
 */
function getChangeTypeIcon(type: string): string {
  switch (type) {
    case "add":
      return "[+]";
    case "modify":
      return "[~]";
    case "delete":
      return "[-]";
    case "refactor":
      return "[R]";
    default:
      return "[ ]";
  }
}

/**
 * Get an icon for severity level
 */
function getSeverityIcon(severity: string | undefined): string {
  switch (severity) {
    case "error":
      return "[!]";
    case "warning":
      return "[?]";
    case "info":
      return "[i]";
    default:
      return "";
  }
}

/**
 * Get an icon for pattern type
 */
function getPatternTypeIcon(type: PatternType | string): string {
  switch (type) {
    case "design_pattern":
      return "[DP]";
    case "anti_pattern":
      return "[AP]";
    case "code_smell":
      return "[CS]";
    case "best_practice":
      return "[BP]";
    case "convention":
      return "[CV]";
    default:
      return "[??]";
  }
}

/**
 * Get an icon for refactoring type
 */
function getRefactoringTypeIcon(type: RefactoringType | string): string {
  switch (type) {
    case "extract_function":
      return "[EF]";
    case "extract_variable":
      return "[EV]";
    case "inline":
      return "[IN]";
    case "rename":
      return "[RN]";
    case "move":
      return "[MV]";
    case "simplify":
      return "[SM]";
    case "decompose":
      return "[DC]";
    default:
      return "[??]";
  }
}
