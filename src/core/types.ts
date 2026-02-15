/**
 * Core type definitions for Archon agents
 *
 * These types define the contract that all agents must fulfill.
 * Think of this as the "job description template" for agent roles.
 *
 * @module core/types
 */

import { z } from "zod";

/**
 * Severity levels for review feedback.
 *
 * Use these to categorize feedback by urgency:
 * - **BLOCKER**: Must fix before merge — bugs, security issues, broken functionality
 * - **SUGGESTION**: Should consider — code quality, maintainability, minor issues
 * - **NITPICK**: Optional — style preferences, minor improvements
 *
 * @example
 * // Security issue = blocker
 * { severity: FeedbackSeverity.BLOCKER, message: "SQL injection risk" }
 *
 * // Code smell = suggestion
 * { severity: FeedbackSeverity.SUGGESTION, message: "Consider extracting this to a helper" }
 *
 * // Style preference = nitpick
 * { severity: FeedbackSeverity.NITPICK, message: "Prefer const over let here" }
 */
export const FeedbackSeverity = {
  BLOCKER: "blocker",
  SUGGESTION: "suggestion",
  NITPICK: "nitpick",
} as const;

export type FeedbackSeverity =
  (typeof FeedbackSeverity)[keyof typeof FeedbackSeverity];

/**
 * A single piece of feedback from a review.
 *
 * Each feedback item points to a specific location in the code
 * and explains what's wrong and how to fix it.
 *
 * @property severity - How urgent is this? See {@link FeedbackSeverity}
 * @property file - Relative path to the file (e.g., "src/utils.ts")
 * @property line - Line number, if applicable. Omit for file-level feedback.
 * @property message - What's the issue? Keep it actionable.
 * @property explanation - Why does this matter? Optional for nitpicks.
 * @property suggestedFix - How to fix it. Code snippet or approach.
 */
export const FeedbackItemSchema = z.object({
  severity: z.enum(["blocker", "suggestion", "nitpick"]),
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
  explanation: z.string().optional(),
  suggestedFix: z.string().optional(),
});

/** Inferred type from {@link FeedbackItemSchema} */
export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;

/**
 * Complete review output from the Code Review Agent.
 *
 * This is the structured result of a code review, designed to be
 * both human-readable and machine-parseable.
 *
 * @property summary - Overall verdict: approve, request_changes, or needs_discussion
 * @property overview - 2-3 sentence summary of the review
 * @property feedback - Array of specific issues found (may be empty)
 * @property positives - What the reviewer liked — keeps feedback constructive
 * @property questions - Clarifications needed from the author
 * @property requiresHumanReview - True if agent thinks a human should also review
 * @property humanReviewReason - Why human review is needed (security, architecture, etc.)
 */
export const ReviewResultSchema = z.object({
  summary: z.enum(["approve", "request_changes", "needs_discussion"]),
  overview: z.string(),
  feedback: z.array(FeedbackItemSchema),
  positives: z.array(z.string()),
  questions: z.array(z.string()),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

/** Inferred type from {@link ReviewResultSchema} */
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

/**
 * Base agent interface — all agents must implement this.
 *
 * Defines the identity of an agent. Used for registration,
 * logging, and determining which agents are available.
 *
 * @property name - Short identifier (e.g., "Reviewer", "Tester")
 * @property role - Human-readable description (e.g., "Code Review Agent")
 * @property status - Lifecycle stage: active (in use), planned (coming soon), deprecated (being phased out)
 * @property version - Semantic version for tracking changes to agent behavior
 */
export type Agent = {
  readonly name: string;
  readonly role: string;
  readonly status: "active" | "planned" | "deprecated";
  readonly version: string;
};

/**
 * Agent capability flags.
 *
 * Declares what an agent is allowed to do. Used for security
 * boundaries and to inform users what permissions an agent needs.
 *
 * @property canModifyFiles - Can the agent write/edit files? (false = read-only)
 * @property canExecuteCommands - Can the agent run shell commands? (e.g., git, npm)
 * @property canAccessNetwork - Can the agent make HTTP requests?
 * @property requiresHumanApproval - Must a human approve before agent actions take effect?
 */
export type AgentCapabilities = {
  canModifyFiles: boolean;
  canExecuteCommands: boolean;
  canAccessNetwork: boolean;
  requiresHumanApproval: boolean;
};

/**
 * Agent execution context.
 *
 * Runtime information passed to an agent when it runs.
 * Provides awareness of the environment and scope of work.
 *
 * @property workingDirectory - Absolute path to the project root
 * @property gitBranch - Current branch name, if in a git repo
 * @property changedFiles - Files modified in current PR/commit, if applicable
 * @property userPreferences - User-specific settings (e.g., verbosity, strictness)
 */
export type AgentContext = {
  workingDirectory: string;
  gitBranch?: string;
  changedFiles?: string[];
  userPreferences?: Record<string, unknown>;
};
