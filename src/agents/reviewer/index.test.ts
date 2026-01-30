import { describe, it, expect } from "vitest";

import { createReviewAgent, formatReviewAsMarkdown } from "./index.js";
import type { ReviewResult } from "../../core/types.js";

describe("createReviewAgent", () => {
  describe("when called with no config", () => {
    it("should return agent with default values", () => {
      const agent = createReviewAgent();

      expect(agent.name).toBe("Reviewer");
      expect(agent.role).toBe("Code Review Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createReviewAgent();

      expect(agent.capabilities).toEqual({
        canModifyFiles: false,
        canExecuteCommands: true,
        canAccessNetwork: false,
        requiresHumanApproval: true,
      });
    });

    it("should have default config values", () => {
      const agent = createReviewAgent();

      expect(agent.config.maxFilesPerReview).toBe(20);
      expect(agent.config.includePositives).toBe(true);
      expect(agent.config.minSeverity).toBe("nitpick");
      expect(agent.config.excludePatterns).toContain("*.lock");
      expect(agent.config.excludePatterns).toContain("node_modules/**");
    });
  });

  describe("when called with config overrides", () => {
    it("should merge overrides with defaults", () => {
      const agent = createReviewAgent({
        maxFilesPerReview: 10,
      });

      expect(agent.config.maxFilesPerReview).toBe(10);
      expect(agent.config.includePositives).toBe(true); // default preserved
    });

    it("should allow overriding all config options", () => {
      const customConfig = {
        maxFilesPerReview: 5,
        excludePatterns: ["custom/**"],
        includePositives: false,
        minSeverity: "blocker" as const,
      };

      const agent = createReviewAgent(customConfig);

      expect(agent.config).toEqual(customConfig);
    });

    it("should not mutate default config", () => {
      const agent1 = createReviewAgent({ maxFilesPerReview: 100 });
      const agent2 = createReviewAgent();

      expect(agent1.config.maxFilesPerReview).toBe(100);
      expect(agent2.config.maxFilesPerReview).toBe(20);
    });
  });
});

describe("formatReviewAsMarkdown", () => {
  const baseReview: ReviewResult = {
    summary: "approve",
    overview: "Code looks good.",
    feedback: [],
    positives: [],
    questions: [],
    requiresHumanReview: false,
  };

  describe("summary formatting", () => {
    it("should format approve summary", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        summary: "approve",
      });

      expect(result).toContain("## Summary");
      expect(result).toContain("✅ Approve");
    });

    it("should format request_changes summary", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        summary: "request_changes",
      });

      expect(result).toContain("🔄 Request Changes");
    });

    it("should format needs_discussion summary", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        summary: "needs_discussion",
      });

      expect(result).toContain("💬 Needs Discussion");
    });
  });

  describe("overview section", () => {
    it("should include overview text", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        overview: "This PR adds authentication.",
      });

      expect(result).toContain("## Overview");
      expect(result).toContain("This PR adds authentication.");
    });
  });

  describe("feedback sections", () => {
    it("should group blockers under red heading", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "blocker",
            file: "auth.ts",
            message: "SQL injection risk",
          },
        ],
      });

      expect(result).toContain("## 🔴 Blockers");
      expect(result).toContain("**[auth.ts]**: SQL injection risk");
    });

    it("should group suggestions under yellow heading", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "suggestion",
            file: "utils.ts",
            message: "Consider caching",
          },
        ],
      });

      expect(result).toContain("## 🟡 Suggestions");
      expect(result).toContain("**[utils.ts]**: Consider caching");
    });

    it("should group nitpicks under green heading", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "nitpick",
            file: "style.ts",
            message: "Inconsistent spacing",
          },
        ],
      });

      expect(result).toContain("## 🟢 Nitpicks");
      expect(result).toContain("**[style.ts]**: Inconsistent spacing");
    });

    it("should include line number when provided", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "blocker",
            file: "auth.ts",
            line: 42,
            message: "Bug here",
          },
        ],
      });

      expect(result).toContain("**[auth.ts:42]**: Bug here");
    });

    it("should include explanation when provided", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "blocker",
            file: "auth.ts",
            message: "SQL injection",
            explanation: "User input is not sanitized",
          },
        ],
      });

      expect(result).toContain("Why: User input is not sanitized");
    });

    it("should include suggested fix when provided", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "suggestion",
            file: "db.ts",
            message: "Use parameterized query",
            suggestedFix: "db.query($1, [value])",
          },
        ],
      });

      expect(result).toContain("Suggestion: db.query($1, [value])");
    });

    it("should handle multiple feedback items of same severity", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          { severity: "blocker", file: "a.ts", message: "Issue 1" },
          { severity: "blocker", file: "b.ts", message: "Issue 2" },
        ],
      });

      expect(result).toContain("**[a.ts]**: Issue 1");
      expect(result).toContain("**[b.ts]**: Issue 2");
    });

    it("should handle mixed severity feedback", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          { severity: "blocker", file: "a.ts", message: "Critical" },
          { severity: "suggestion", file: "b.ts", message: "Consider" },
          { severity: "nitpick", file: "c.ts", message: "Minor" },
        ],
      });

      expect(result).toContain("## 🔴 Blockers");
      expect(result).toContain("## 🟡 Suggestions");
      expect(result).toContain("## 🟢 Nitpicks");
    });

    it("should omit empty severity sections", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        feedback: [
          {
            severity: "suggestion",
            file: "a.ts",
            message: "Just a suggestion",
          },
        ],
      });

      expect(result).not.toContain("## 🔴 Blockers");
      expect(result).toContain("## 🟡 Suggestions");
      expect(result).not.toContain("## 🟢 Nitpicks");
    });
  });

  describe("positives section", () => {
    it("should include positives when present", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        positives: ["Good test coverage", "Clean code structure"],
      });

      expect(result).toContain("## What I Liked");
      expect(result).toContain("- Good test coverage");
      expect(result).toContain("- Clean code structure");
    });

    it("should omit positives section when empty", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        positives: [],
      });

      expect(result).not.toContain("## What I Liked");
    });
  });

  describe("questions section", () => {
    it("should include questions when present", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        questions: ["Why this approach?", "Was this intentional?"],
      });

      expect(result).toContain("## Questions");
      expect(result).toContain("- Why this approach?");
      expect(result).toContain("- Was this intentional?");
    });

    it("should omit questions section when empty", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        questions: [],
      });

      expect(result).not.toContain("## Questions");
    });
  });

  describe("human review notice", () => {
    it("should show notice when human review required", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        requiresHumanReview: true,
        humanReviewReason: "Security implications",
      });

      expect(result).toContain(
        "⚠️ **Human review required**: Security implications",
      );
    });

    it("should show default reason when not provided", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        requiresHumanReview: true,
      });

      expect(result).toContain(
        "⚠️ **Human review required**: See blockers above",
      );
    });

    it("should not show notice when human review not required", () => {
      const result = formatReviewAsMarkdown({
        ...baseReview,
        requiresHumanReview: false,
      });

      expect(result).not.toContain("Human review required");
    });
  });

  describe("edge cases", () => {
    it("should handle empty review", () => {
      const result = formatReviewAsMarkdown(baseReview);

      expect(result).toContain("## Summary");
      expect(result).toContain("## Overview");
      expect(result).not.toContain("## 🔴 Blockers");
      expect(result).not.toContain("## What I Liked");
      expect(result).not.toContain("## Questions");
    });

    it("should handle review with all sections populated", () => {
      const fullReview: ReviewResult = {
        summary: "request_changes",
        overview: "Some issues found.",
        feedback: [
          {
            severity: "blocker",
            file: "a.ts",
            line: 10,
            message: "Bug",
            explanation: "Why",
            suggestedFix: "Fix",
          },
          { severity: "suggestion", file: "b.ts", message: "Improve" },
          { severity: "nitpick", file: "c.ts", message: "Style" },
        ],
        positives: ["Good naming"],
        questions: ["Why X?"],
        requiresHumanReview: true,
        humanReviewReason: "Needs architect review",
      };

      const result = formatReviewAsMarkdown(fullReview);

      expect(result).toContain("🔄 Request Changes");
      expect(result).toContain("Some issues found.");
      expect(result).toContain("## 🔴 Blockers");
      expect(result).toContain("## 🟡 Suggestions");
      expect(result).toContain("## 🟢 Nitpicks");
      expect(result).toContain("## What I Liked");
      expect(result).toContain("## Questions");
      expect(result).toContain("Needs architect review");
    });
  });
});
