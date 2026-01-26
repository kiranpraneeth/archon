/**
 * Core type definitions for Archon agents
 *
 * These types define the contract that all agents must fulfill.
 * Think of this as the "job description template" for agent roles.
 */

import { z } from 'zod';

/**
 * Severity levels for review feedback
 */
export const FeedbackSeverity = {
  BLOCKER: 'blocker',
  SUGGESTION: 'suggestion',
  NITPICK: 'nitpick',
} as const;

export type FeedbackSeverity = (typeof FeedbackSeverity)[keyof typeof FeedbackSeverity];

/**
 * A single piece of feedback from a review
 */
export const FeedbackItemSchema = z.object({
  severity: z.enum(['blocker', 'suggestion', 'nitpick']),
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
  explanation: z.string().optional(),
  suggestedFix: z.string().optional(),
});

export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;

/**
 * Complete review output from the Code Review Agent
 */
export const ReviewResultSchema = z.object({
  summary: z.enum(['approve', 'request_changes', 'needs_discussion']),
  overview: z.string(),
  feedback: z.array(FeedbackItemSchema),
  positives: z.array(z.string()),
  questions: z.array(z.string()),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

/**
 * Base agent interface — all agents must implement this
 */
export type Agent = {
  readonly name: string;
  readonly role: string;
  readonly status: 'active' | 'planned' | 'deprecated';
  readonly version: string;
};

/**
 * Agent capability flags
 */
export type AgentCapabilities = {
  canModifyFiles: boolean;
  canExecuteCommands: boolean;
  canAccessNetwork: boolean;
  requiresHumanApproval: boolean;
};

/**
 * Agent execution context
 */
export type AgentContext = {
  workingDirectory: string;
  gitBranch?: string;
  changedFiles?: string[];
  userPreferences?: Record<string, unknown>;
};
