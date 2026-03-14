/**
 * Planning Agent — Archon
 *
 * This agent converts product requirements (PRDs) into technical specifications
 * and implementation plans. It analyzes requirements, identifies technical risks,
 * and recommends architecture decisions.
 *
 * The agent follows the planning philosophy defined in .claude/agents/planner/CLAUDE.md
 *
 * Note: The actual planning logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../../core/types.js";

/**
 * Risk severity levels for identified technical risks.
 *
 * - CRITICAL: Must address before starting — blocking issues, security concerns
 * - HIGH: Should address in planning — significant complexity, dependencies
 * - MEDIUM: Should have mitigation plan — moderate risk, fallback options
 * - LOW: Monitor during implementation — minor concerns, nice-to-have mitigations
 */
export const RiskSeverity = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type RiskSeverity = (typeof RiskSeverity)[keyof typeof RiskSeverity];

/**
 * Complexity levels for implementation estimates.
 */
export const Complexity = {
  TRIVIAL: "trivial",
  SIMPLE: "simple",
  MODERATE: "moderate",
  COMPLEX: "complex",
  VERY_COMPLEX: "very_complex",
} as const;

export type Complexity = (typeof Complexity)[keyof typeof Complexity];

/**
 * Categories for technical tasks.
 */
export const TaskCategory = {
  SETUP: "setup",
  FEATURE: "feature",
  INTEGRATION: "integration",
  TESTING: "testing",
  DOCUMENTATION: "documentation",
  REFACTORING: "refactoring",
  INFRASTRUCTURE: "infrastructure",
} as const;

export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

/**
 * Represents a technical risk identified during planning.
 */
export const TechnicalRiskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  category: z.string(),
  mitigation: z.string(),
  acceptanceCriteria: z.string().optional(),
});

export type TechnicalRisk = z.infer<typeof TechnicalRiskSchema>;

/**
 * Represents a dependency identified during planning.
 */
export const DependencySchema = z.object({
  name: z.string(),
  type: z.enum(["external", "internal", "service", "data"]),
  description: z.string(),
  required: z.boolean(),
  version: z.string().optional(),
  alternative: z.string().optional(),
});

export type Dependency = z.infer<typeof DependencySchema>;

/**
 * Represents a file or module in the recommended architecture.
 */
export const FileSpecSchema = z.object({
  path: z.string(),
  purpose: z.string(),
  exports: z.array(z.string()),
  dependencies: z.array(z.string()),
  complexity: z.enum([
    "trivial",
    "simple",
    "moderate",
    "complex",
    "very_complex",
  ]),
  notes: z.string().optional(),
});

export type FileSpec = z.infer<typeof FileSpecSchema>;

/**
 * Represents a technical task to be implemented.
 */
export const TechnicalTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum([
    "setup",
    "feature",
    "integration",
    "testing",
    "documentation",
    "refactoring",
    "infrastructure",
  ]),
  complexity: z.enum([
    "trivial",
    "simple",
    "moderate",
    "complex",
    "very_complex",
  ]),
  files: z.array(z.string()),
  dependencies: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  blockedBy: z.array(z.string()),
  order: z.number(),
});

export type TechnicalTask = z.infer<typeof TechnicalTaskSchema>;

/**
 * Represents a requirement extracted from the PRD.
 */
export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(["functional", "non_functional", "constraint"]),
  priority: z.enum(["must_have", "should_have", "nice_to_have"]),
  source: z.string().optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

/**
 * Complete technical specification generated from a PRD.
 */
export const TechnicalSpecSchema = z.object({
  title: z.string(),
  summary: z.string(),
  generatedAt: z.string(),
  prdSource: z.string(),
  requirements: z.array(RequirementSchema),
  architecture: z.object({
    overview: z.string(),
    files: z.array(FileSpecSchema),
    dataFlow: z.string().optional(),
    integrationPoints: z.array(z.string()),
  }),
  tasks: z.array(TechnicalTaskSchema),
  risks: z.array(TechnicalRiskSchema),
  dependencies: z.array(DependencySchema),
  estimatedComplexity: z.enum([
    "trivial",
    "simple",
    "moderate",
    "complex",
    "very_complex",
  ]),
  openQuestions: z.array(z.string()),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

export type TechnicalSpec = z.infer<typeof TechnicalSpecSchema>;

/**
 * Planning Agent configuration
 */
export type PlannerConfig = {
  /** Include implementation order recommendations */
  includeTaskOrdering: boolean;
  /** Generate risk mitigation strategies */
  includeRiskMitigation: boolean;
  /** Identify external dependencies */
  analyzeDependencies: boolean;
  /** Maximum tasks to generate */
  maxTasks: number;
  /** Output format for specs */
  outputFormat: "markdown" | "json";
};

/** Default configuration for the Planning Agent */
const DEFAULT_CONFIG: PlannerConfig = {
  includeTaskOrdering: true,
  includeRiskMitigation: true,
  analyzeDependencies: true,
  maxTasks: 50,
  outputFormat: "markdown",
};

/**
 * Planning Agent definition
 */
export type PlannerAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: PlannerConfig;
};

/**
 * Create a Planning Agent instance
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns A configured PlannerAgent instance
 *
 * @example
 * // Create with defaults
 * const agent = createPlannerAgent();
 *
 * @example
 * // Output as JSON instead of markdown
 * const agent = createPlannerAgent({ outputFormat: 'json' });
 */
export function createPlannerAgent(
  configOverrides: Partial<PlannerConfig> = {},
): PlannerAgent {
  const config: PlannerConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Planner",
    role: "Planning Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: false, // Read-only analysis
      canExecuteCommands: false, // No shell commands needed
      canAccessNetwork: false, // No external access needed
      requiresHumanApproval: true, // Plans need review before execution
    },
    config,
  };
}

/**
 * Format a technical specification as markdown
 *
 * This is used when outputting planning results in a human-readable format.
 *
 * @param spec - The technical specification to format
 * @returns Markdown-formatted specification string
 */
export function formatTechnicalSpec(spec: TechnicalSpec): string {
  const lines: string[] = [
    `# Technical Specification: ${spec.title}`,
    "",
    `**Generated:** ${spec.generatedAt}`,
    `**PRD Source:** \`${spec.prdSource}\``,
    `**Overall Complexity:** ${getComplexityLabel(spec.estimatedComplexity)}`,
    "",
    "## Summary",
    "",
    spec.summary,
    "",
  ];

  // Requirements
  if (spec.requirements.length > 0) {
    lines.push("## Requirements", "");

    const mustHave = spec.requirements.filter(
      (r) => r.priority === "must_have",
    );
    const shouldHave = spec.requirements.filter(
      (r) => r.priority === "should_have",
    );
    const niceToHave = spec.requirements.filter(
      (r) => r.priority === "nice_to_have",
    );

    if (mustHave.length > 0) {
      lines.push("### Must Have", "");
      for (const req of mustHave) {
        const typeIcon = getRequirementTypeIcon(req.type);
        lines.push(`- ${typeIcon} **${req.id}**: ${req.title}`);
        lines.push(`  - ${req.description}`);
      }
      lines.push("");
    }

    if (shouldHave.length > 0) {
      lines.push("### Should Have", "");
      for (const req of shouldHave) {
        const typeIcon = getRequirementTypeIcon(req.type);
        lines.push(`- ${typeIcon} **${req.id}**: ${req.title}`);
        lines.push(`  - ${req.description}`);
      }
      lines.push("");
    }

    if (niceToHave.length > 0) {
      lines.push("### Nice to Have", "");
      for (const req of niceToHave) {
        const typeIcon = getRequirementTypeIcon(req.type);
        lines.push(`- ${typeIcon} **${req.id}**: ${req.title}`);
        lines.push(`  - ${req.description}`);
      }
      lines.push("");
    }
  }

  // Architecture
  lines.push("## Architecture", "");
  lines.push(spec.architecture.overview, "");

  if (spec.architecture.files.length > 0) {
    lines.push("### File Structure", "");
    lines.push("| Path | Purpose | Complexity |");
    lines.push("|------|---------|------------|");
    for (const file of spec.architecture.files) {
      lines.push(
        `| \`${file.path}\` | ${file.purpose} | ${getComplexityLabel(file.complexity)} |`,
      );
    }
    lines.push("");
  }

  if (spec.architecture.dataFlow) {
    lines.push("### Data Flow", "");
    lines.push(spec.architecture.dataFlow, "");
  }

  if (spec.architecture.integrationPoints.length > 0) {
    lines.push("### Integration Points", "");
    for (const point of spec.architecture.integrationPoints) {
      lines.push(`- ${point}`);
    }
    lines.push("");
  }

  // Tasks
  if (spec.tasks.length > 0) {
    lines.push("## Implementation Tasks", "");

    const sortedTasks = [...spec.tasks].sort((a, b) => a.order - b.order);

    for (const task of sortedTasks) {
      const complexityIcon = getComplexityIcon(task.complexity);
      lines.push(`### ${task.order}. ${task.title}`);
      lines.push("");
      lines.push(`**ID:** ${task.id}`);
      lines.push(`**Category:** ${task.category}`);
      lines.push(
        `**Complexity:** ${complexityIcon} ${getComplexityLabel(task.complexity)}`,
      );
      lines.push("");
      lines.push(task.description);
      lines.push("");

      if (task.files.length > 0) {
        lines.push("**Files:**");
        for (const file of task.files) {
          lines.push(`- \`${file}\``);
        }
        lines.push("");
      }

      if (task.blockedBy.length > 0) {
        lines.push(`**Blocked by:** ${task.blockedBy.join(", ")}`);
        lines.push("");
      }

      lines.push("**Acceptance Criteria:**");
      for (const criterion of task.acceptanceCriteria) {
        lines.push(`- [ ] ${criterion}`);
      }
      lines.push("");
    }
  }

  // Risks
  if (spec.risks.length > 0) {
    lines.push("## Technical Risks", "");

    const criticalRisks = spec.risks.filter((r) => r.severity === "critical");
    const highRisks = spec.risks.filter((r) => r.severity === "high");
    const mediumRisks = spec.risks.filter((r) => r.severity === "medium");
    const lowRisks = spec.risks.filter((r) => r.severity === "low");

    if (criticalRisks.length > 0) {
      lines.push("### 🔴 Critical Risks", "");
      for (const risk of criticalRisks) {
        lines.push(`#### ${risk.id}: ${risk.title}`);
        lines.push(risk.description);
        lines.push("");
        lines.push(`**Mitigation:** ${risk.mitigation}`);
        lines.push("");
      }
    }

    if (highRisks.length > 0) {
      lines.push("### 🟠 High Risks", "");
      for (const risk of highRisks) {
        lines.push(`#### ${risk.id}: ${risk.title}`);
        lines.push(risk.description);
        lines.push("");
        lines.push(`**Mitigation:** ${risk.mitigation}`);
        lines.push("");
      }
    }

    if (mediumRisks.length > 0) {
      lines.push("### 🟡 Medium Risks", "");
      for (const risk of mediumRisks) {
        lines.push(`- **${risk.title}**: ${risk.description}`);
        lines.push(`  - Mitigation: ${risk.mitigation}`);
      }
      lines.push("");
    }

    if (lowRisks.length > 0) {
      lines.push("### 🟢 Low Risks", "");
      for (const risk of lowRisks) {
        lines.push(`- **${risk.title}**: ${risk.description}`);
      }
      lines.push("");
    }
  }

  // Dependencies
  if (spec.dependencies.length > 0) {
    lines.push("## Dependencies", "");

    const required = spec.dependencies.filter((d) => d.required);
    const optional = spec.dependencies.filter((d) => !d.required);

    if (required.length > 0) {
      lines.push("### Required", "");
      for (const dep of required) {
        const version = dep.version ? ` (${dep.version})` : "";
        lines.push(
          `- **${dep.name}**${version} (${dep.type}): ${dep.description}`,
        );
      }
      lines.push("");
    }

    if (optional.length > 0) {
      lines.push("### Optional", "");
      for (const dep of optional) {
        const alt = dep.alternative ? ` Alternative: ${dep.alternative}` : "";
        lines.push(`- **${dep.name}** (${dep.type}): ${dep.description}${alt}`);
      }
      lines.push("");
    }
  }

  // Open Questions
  if (spec.openQuestions.length > 0) {
    lines.push("## Open Questions", "");
    for (const question of spec.openQuestions) {
      lines.push(`- [ ] ${question}`);
    }
    lines.push("");
  }

  // Human review notice
  if (spec.requiresHumanReview) {
    lines.push("---");
    lines.push(
      "⚠️ **Human review required**: " +
        (spec.humanReviewReason ?? "Architecture decisions need validation"),
    );
  }

  return lines.join("\n");
}

/**
 * Get a human-readable label for complexity level
 */
function getComplexityLabel(complexity: Complexity | string): string {
  switch (complexity) {
    case "trivial":
      return "Trivial";
    case "simple":
      return "Simple";
    case "moderate":
      return "Moderate";
    case "complex":
      return "Complex";
    case "very_complex":
      return "Very Complex";
    default:
      return complexity;
  }
}

/**
 * Get an icon for complexity level
 */
function getComplexityIcon(complexity: Complexity | string): string {
  switch (complexity) {
    case "trivial":
      return "⚪";
    case "simple":
      return "🟢";
    case "moderate":
      return "🟡";
    case "complex":
      return "🟠";
    case "very_complex":
      return "🔴";
    default:
      return "•";
  }
}

/**
 * Get an icon for requirement type
 */
function getRequirementTypeIcon(type: string): string {
  switch (type) {
    case "functional":
      return "⚙️";
    case "non_functional":
      return "📊";
    case "constraint":
      return "🔒";
    default:
      return "•";
  }
}
