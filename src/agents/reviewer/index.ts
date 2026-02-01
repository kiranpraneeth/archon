/**
 * Code Review Agent — Archon
 *
 * This agent provides automated code review with context-aware feedback.
 * It follows the review philosophy defined in .claude/agents/reviewer/CLAUDE.md
 *
 * The agent emphasizes constructive feedback, prioritized by severity,
 * and always includes positive observations to maintain team morale.
 *
 * Note: The actual review logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import type {
  Agent,
  AgentCapabilities,
  FeedbackItem,
  ReviewResult,
} from "../../core/types.js";

/**
 * Code Review Agent configuration
 */
export type ReviewerConfig = {
  /** Maximum files to review in a single pass */
  maxFilesPerReview: number;
  /** File patterns to always skip */
  excludePatterns: string[];
  /** Whether to include positive feedback */
  includePositives: boolean;
  /** Minimum severity to report */
  minSeverity: "blocker" | "suggestion" | "nitpick";
};

const DEFAULT_CONFIG: ReviewerConfig = {
  maxFilesPerReview: 20,
  excludePatterns: [
    "*.lock",
    "*.min.js",
    "*.min.css",
    "dist/**",
    "node_modules/**",
    "*.generated.*",
  ],
  includePositives: true,
  minSeverity: "nitpick",
};

/**
 * Code Review Agent definition
 */
export type ReviewerAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: ReviewerConfig;
};

/**
 * Create a Code Review Agent instance
 */
export function createReviewAgent(
  configOverrides: Partial<ReviewerConfig> = {},
): ReviewerAgent {
  const config: ReviewerConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Reviewer",
    role: "Code Review Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: false, // Read-only — reviews but doesn't change
      canExecuteCommands: true, // Needs git commands
      canAccessNetwork: false, // No external access needed
      requiresHumanApproval: true, // Recommendations only
    },
    config,
  };
}

/**
 * Format a review result as markdown
 *
 * This is used when outputting review results in a human-readable format.
 */
export function formatReviewAsMarkdown(review: ReviewResult): string {
  const summaryText = {
    approve: "✅ Approve",
    request_changes: "🔄 Request Changes",
    needs_discussion: "💬 Needs Discussion",
  };

  const lines: string[] = [
    "## Summary",
    summaryText[review.summary],
    "",
    "## Overview",
    review.overview,
    "",
  ];

  // Group feedback by severity
  const blockers = review.feedback.filter((f) => f.severity === "blocker");
  const suggestions = review.feedback.filter(
    (f) => f.severity === "suggestion",
  );
  const nitpicks = review.feedback.filter((f) => f.severity === "nitpick");

  if (blockers.length > 0) {
    lines.push("## 🔴 Blockers", "");
    for (const item of blockers) {
      lines.push(formatFeedbackItem(item));
    }
    lines.push("");
  }

  if (suggestions.length > 0) {
    lines.push("## 🟡 Suggestions", "");
    for (const item of suggestions) {
      lines.push(formatFeedbackItem(item));
    }
    lines.push("");
  }

  if (nitpicks.length > 0) {
    lines.push("## 🟢 Nitpicks", "");
    for (const item of nitpicks) {
      lines.push(formatFeedbackItem(item));
    }
    lines.push("");
  }

  if (review.positives.length > 0) {
    lines.push("## What I Liked", "");
    for (const positive of review.positives) {
      lines.push(`- ${positive}`);
    }
    lines.push("");
  }

  if (review.questions.length > 0) {
    lines.push("## Questions", "");
    for (const question of review.questions) {
      lines.push(`- ${question}`);
    }
    lines.push("");
  }

  if (review.requiresHumanReview) {
    lines.push("---");
    lines.push(
      "⚠️ **Human review required**: " +
        (review.humanReviewReason ?? "See blockers above"),
    );
  }

  return lines.join("\n");
}

function formatFeedbackItem(item: FeedbackItem): string {
  const location = item.line ? `${item.file}:${item.line}` : item.file;
  let result = `- **[${location}]**: ${item.message}`;

  if (item.explanation) {
    result += `\n  - Why: ${item.explanation}`;
  }

  if (item.suggestedFix) {
    result += `\n  - Suggestion: ${item.suggestedFix}`;
  }

  return result;
}
