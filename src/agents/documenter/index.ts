/**
 * Documentation Agent — Archon
 *
 * This agent maintains accurate, technically correct documentation that helps
 * engineers understand and use the codebase effectively.
 * It follows the documentation philosophy defined in .claude/agents/documenter/CLAUDE.md
 *
 * The agent handles JSDoc generation, README sync, and documentation auditing.
 *
 * Note: The actual documentation generation logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../../core/types.js";

/**
 * Documentation item priority levels.
 *
 * - HIGH: Public APIs, exported functions — must be documented
 * - MEDIUM: Internal modules, shared utilities — should be documented
 * - LOW: Private helpers, internal implementation — nice to have
 */
export const DocPriority = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type DocPriority = (typeof DocPriority)[keyof typeof DocPriority];

/**
 * Types of documentation items.
 */
export const DocItemType = {
  JSDOC: "jsdoc",
  README: "readme",
  MODULE: "module",
  API: "api",
  EXAMPLE: "example",
} as const;

export type DocItemType = (typeof DocItemType)[keyof typeof DocItemType];

/**
 * Status of documentation for an item.
 */
export const DocStatus = {
  MISSING: "missing",
  OUTDATED: "outdated",
  INCOMPLETE: "incomplete",
  COMPLETE: "complete",
} as const;

export type DocStatus = (typeof DocStatus)[keyof typeof DocStatus];

/**
 * Represents a single documentation item that needs attention.
 */
export const DocItemSchema = z.object({
  name: z.string(),
  type: z.enum(["jsdoc", "readme", "module", "api", "example"]),
  file: z.string(),
  line: z.number().optional(),
  status: z.enum(["missing", "outdated", "incomplete", "complete"]),
  priority: z.enum(["high", "medium", "low"]),
  description: z.string(),
  suggestedContent: z.string().optional(),
});

export type DocItem = z.infer<typeof DocItemSchema>;

/**
 * Represents a JSDoc comment that was generated or updated.
 */
export const JSDocEntrySchema = z.object({
  functionName: z.string(),
  file: z.string(),
  line: z.number(),
  originalDoc: z.string().optional(),
  generatedDoc: z.string(),
  params: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
    }),
  ),
  returns: z
    .object({
      type: z.string(),
      description: z.string(),
    })
    .optional(),
  examples: z.array(z.string()),
});

export type JSDocEntry = z.infer<typeof JSDocEntrySchema>;

/**
 * README section that needs attention.
 */
export const ReadmeSectionSchema = z.object({
  heading: z.string(),
  status: z.enum(["missing", "outdated", "incomplete", "complete"]),
  currentContent: z.string().optional(),
  suggestedContent: z.string().optional(),
  reason: z.string(),
});

export type ReadmeSection = z.infer<typeof ReadmeSectionSchema>;

/**
 * Documentation audit report.
 */
export const DocAuditReportSchema = z.object({
  targetPath: z.string(),
  generatedAt: z.string(),
  totalItems: z.number(),
  documented: z.number(),
  missing: z.number(),
  outdated: z.number(),
  incomplete: z.number(),
  items: z.array(DocItemSchema),
  readmeSections: z.array(ReadmeSectionSchema),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

export type DocAuditReport = z.infer<typeof DocAuditReportSchema>;

/**
 * Complete documentation generation report.
 */
export const DocReportSchema = z.object({
  targetPath: z.string(),
  generatedAt: z.string(),
  mode: z.enum(["generate", "audit", "smart"]),
  filesProcessed: z.number(),
  jsDocEntries: z.array(JSDocEntrySchema),
  readmeSections: z.array(ReadmeSectionSchema),
  gaps: z.array(DocItemSchema),
  suggestions: z.array(z.string()),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

export type DocReport = z.infer<typeof DocReportSchema>;

/**
 * Documentation Agent configuration
 */
export type DocumenterConfig = {
  /** Include private functions in documentation */
  includePrivate: boolean;
  /** Generate usage examples for exported functions */
  generateExamples: boolean;
  /** Check README sections for completeness */
  auditReadme: boolean;
  /** File patterns to include */
  includePatterns: string[];
  /** File patterns to exclude */
  excludePatterns: string[];
  /** Output format for reports */
  outputFormat: "markdown" | "json";
};

/** Default configuration for the Documentation Agent */
const DEFAULT_CONFIG: DocumenterConfig = {
  includePrivate: false,
  generateExamples: true,
  auditReadme: true,
  includePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  excludePatterns: [
    "*.d.ts",
    "*.test.*",
    "*.spec.*",
    "node_modules/**",
    "dist/**",
    "coverage/**",
  ],
  outputFormat: "markdown",
};

/**
 * Documentation Agent definition
 */
export type DocumenterAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: DocumenterConfig;
};

/**
 * Create a Documentation Agent instance
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns A configured DocumenterAgent instance
 *
 * @example
 * // Create with defaults
 * const agent = createDocumenterAgent();
 *
 * @example
 * // Include private functions
 * const agent = createDocumenterAgent({ includePrivate: true });
 */
export function createDocumenterAgent(
  configOverrides: Partial<DocumenterConfig> = {},
): DocumenterAgent {
  const config: DocumenterConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Documenter",
    role: "Documentation Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: true, // Updates documentation in files
      canExecuteCommands: false, // No shell commands needed
      canAccessNetwork: false, // No external access needed
      requiresHumanApproval: false, // Doc updates are safe
    },
    config,
  };
}

/**
 * Format a documentation report as markdown
 *
 * This is used when outputting documentation generation results in a human-readable format.
 *
 * @param report - The documentation report to format
 * @returns Markdown-formatted report string
 */
export function formatDocReport(report: DocReport): string {
  const lines: string[] = [
    "# Documentation Report",
    "",
    `**Target:** \`${report.targetPath}\``,
    `**Mode:** ${report.mode}`,
    `**Generated:** ${report.generatedAt}`,
    `**Files Processed:** ${report.filesProcessed}`,
    "",
  ];

  // Summary
  lines.push("## Summary", "");
  lines.push(`- **JSDoc Entries:** ${report.jsDocEntries.length}`);
  lines.push(`- **README Sections:** ${report.readmeSections.length}`);
  lines.push(`- **Documentation Gaps:** ${report.gaps.length}`);
  lines.push("");

  // JSDoc entries
  if (report.jsDocEntries.length > 0) {
    lines.push("## JSDoc Entries", "");
    for (const entry of report.jsDocEntries) {
      const statusIcon = entry.originalDoc ? "📝" : "✨";
      lines.push(`### ${statusIcon} \`${entry.functionName}\``);
      lines.push(`**File:** \`${entry.file}:${entry.line}\``);
      lines.push("");

      if (entry.params.length > 0) {
        lines.push("**Parameters:**");
        for (const param of entry.params) {
          lines.push(
            `- \`${param.name}\` (\`${param.type}\`): ${param.description}`,
          );
        }
        lines.push("");
      }

      if (entry.returns) {
        lines.push(
          `**Returns:** \`${entry.returns.type}\` — ${entry.returns.description}`,
        );
        lines.push("");
      }

      if (entry.examples.length > 0) {
        lines.push("**Examples:**");
        for (const example of entry.examples) {
          lines.push("```typescript");
          lines.push(example);
          lines.push("```");
        }
        lines.push("");
      }
    }
  }

  // README sections
  if (report.readmeSections.length > 0) {
    lines.push("## README Sections", "");
    for (const section of report.readmeSections) {
      const statusIcon = getStatusIcon(section.status);
      lines.push(`- ${statusIcon} **${section.heading}**: ${section.reason}`);
    }
    lines.push("");
  }

  // Documentation gaps
  if (report.gaps.length > 0) {
    lines.push("## Documentation Gaps", "");

    const byPriority = new Map<string, DocItem[]>();
    for (const item of report.gaps) {
      const existing = byPriority.get(item.priority) ?? [];
      existing.push(item);
      byPriority.set(item.priority, existing);
    }

    const priorityOrder = ["high", "medium", "low"];
    const priorityLabels: Record<string, string> = {
      high: "🔴 High Priority",
      medium: "🟡 Medium Priority",
      low: "🟢 Low Priority",
    };

    for (const priority of priorityOrder) {
      const items = byPriority.get(priority);
      if (items && items.length > 0) {
        lines.push(`### ${priorityLabels[priority]}`, "");
        for (const item of items) {
          const statusIcon = getStatusIcon(item.status);
          lines.push(`- ${statusIcon} \`${item.name}\` (${item.type})`);
          lines.push(
            `  - File: \`${item.file}${item.line ? `:${item.line}` : ""}\``,
          );
          lines.push(`  - ${item.description}`);
        }
        lines.push("");
      }
    }
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

/**
 * Format a documentation audit report as markdown
 *
 * @param report - The audit report to format
 * @returns Markdown-formatted audit report string
 */
export function formatAuditReport(report: DocAuditReport): string {
  const lines: string[] = [
    "# Documentation Audit Report",
    "",
    `**Target:** \`${report.targetPath}\``,
    `**Generated:** ${report.generatedAt}`,
    "",
  ];

  // Coverage summary
  const coveragePercent =
    report.totalItems > 0
      ? Math.round((report.documented / report.totalItems) * 100)
      : 0;

  lines.push("## Coverage Summary", "");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Items | ${report.totalItems} |`);
  lines.push(`| Documented | ${report.documented} (${coveragePercent}%) |`);
  lines.push(`| Missing | ${report.missing} |`);
  lines.push(`| Outdated | ${report.outdated} |`);
  lines.push(`| Incomplete | ${report.incomplete} |`);
  lines.push("");

  // Items by status
  const missingItems: DocItem[] = [];
  const outdatedItems: DocItem[] = [];
  const incompleteItems: DocItem[] = [];
  const completeItems: DocItem[] = [];

  for (const item of report.items) {
    switch (item.status) {
      case "missing":
        missingItems.push(item);
        break;
      case "outdated":
        outdatedItems.push(item);
        break;
      case "incomplete":
        incompleteItems.push(item);
        break;
      case "complete":
        completeItems.push(item);
        break;
    }
  }

  if (missingItems.length > 0) {
    lines.push("## ❌ Missing Documentation", "");
    for (const item of missingItems) {
      const priorityIcon = getPriorityIcon(item.priority);
      lines.push(`- ${priorityIcon} \`${item.name}\` (${item.type})`);
      lines.push(
        `  - File: \`${item.file}${item.line ? `:${item.line}` : ""}\``,
      );
      lines.push(`  - ${item.description}`);
    }
    lines.push("");
  }

  if (outdatedItems.length > 0) {
    lines.push("## ⚠️ Outdated Documentation", "");
    for (const item of outdatedItems) {
      const priorityIcon = getPriorityIcon(item.priority);
      lines.push(`- ${priorityIcon} \`${item.name}\` (${item.type})`);
      lines.push(
        `  - File: \`${item.file}${item.line ? `:${item.line}` : ""}\``,
      );
      lines.push(`  - ${item.description}`);
    }
    lines.push("");
  }

  if (incompleteItems.length > 0) {
    lines.push("## 📝 Incomplete Documentation", "");
    for (const item of incompleteItems) {
      const priorityIcon = getPriorityIcon(item.priority);
      lines.push(`- ${priorityIcon} \`${item.name}\` (${item.type})`);
      lines.push(
        `  - File: \`${item.file}${item.line ? `:${item.line}` : ""}\``,
      );
      lines.push(`  - ${item.description}`);
    }
    lines.push("");
  }

  if (completeItems.length > 0) {
    lines.push("## ✅ Well Documented", "");
    for (const item of completeItems) {
      lines.push(`- \`${item.name}\` (${item.type})`);
    }
    lines.push("");
  }

  // README sections
  if (report.readmeSections.length > 0) {
    lines.push("## README Analysis", "");
    for (const section of report.readmeSections) {
      const statusIcon = getStatusIcon(section.status);
      lines.push(`- ${statusIcon} **${section.heading}**: ${section.reason}`);
    }
    lines.push("");
  }

  // Human review notice
  if (report.requiresHumanReview) {
    lines.push("---");
    lines.push(
      "⚠️ **Human review required**: " +
        (report.humanReviewReason ?? "Some items require manual documentation"),
    );
  }

  return lines.join("\n");
}

/**
 * Get the status icon for a documentation status
 */
function getStatusIcon(status: DocStatus | string): string {
  switch (status) {
    case "missing":
      return "❌";
    case "outdated":
      return "⚠️";
    case "incomplete":
      return "📝";
    case "complete":
      return "✅";
    default:
      return "•";
  }
}

/**
 * Get the priority icon for a documentation priority
 */
function getPriorityIcon(priority: DocPriority | string): string {
  switch (priority) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
    default:
      return "•";
  }
}
