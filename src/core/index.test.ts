import { describe, it, expect } from "vitest";

import {
  FeedbackSeverity,
  FeedbackItemSchema,
  ReviewResultSchema,
} from "./index.js";

describe("FeedbackSeverity", () => {
  it("should have blocker, suggestion, and nitpick values", () => {
    expect(FeedbackSeverity.BLOCKER).toBe("blocker");
    expect(FeedbackSeverity.SUGGESTION).toBe("suggestion");
    expect(FeedbackSeverity.NITPICK).toBe("nitpick");
  });
});

describe("FeedbackItemSchema", () => {
  describe("when validating valid input", () => {
    it("should accept minimal valid feedback item", () => {
      const input = {
        severity: "blocker",
        file: "src/index.ts",
        message: "Missing null check",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept feedback item with all optional fields", () => {
      const input = {
        severity: "suggestion",
        file: "src/utils.ts",
        line: 42,
        message: "Consider using const",
        explanation: "Const signals immutability",
        suggestedFix: "const foo = bar;",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.line).toBe(42);
        expect(result.data.explanation).toBe("Const signals immutability");
      }
    });

    it("should accept all severity levels", () => {
      const severities = ["blocker", "suggestion", "nitpick"] as const;

      severities.forEach((severity) => {
        const result = FeedbackItemSchema.safeParse({
          severity,
          file: "test.ts",
          message: "Test message",
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("when validating invalid input", () => {
    it("should reject missing severity", () => {
      const input = {
        file: "src/index.ts",
        message: "Missing null check",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid severity value", () => {
      const input = {
        severity: "critical",
        file: "src/index.ts",
        message: "Test",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing file", () => {
      const input = {
        severity: "blocker",
        message: "Test",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing message", () => {
      const input = {
        severity: "blocker",
        file: "test.ts",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject non-number line", () => {
      const input = {
        severity: "blocker",
        file: "test.ts",
        message: "Test",
        line: "42",
      };

      const result = FeedbackItemSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe("ReviewResultSchema", () => {
  const validFeedback = {
    severity: "blocker" as const,
    file: "test.ts",
    message: "Test issue",
  };

  describe("when validating valid input", () => {
    it("should accept minimal valid review result", () => {
      const input = {
        summary: "approve",
        overview: "Looks good",
        feedback: [],
        positives: [],
        questions: [],
        requiresHumanReview: false,
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept review with all fields populated", () => {
      const input = {
        summary: "request_changes",
        overview: "Found some issues",
        feedback: [validFeedback],
        positives: ["Good test coverage"],
        questions: ["Why this approach?"],
        requiresHumanReview: true,
        humanReviewReason: "Security concern",
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.feedback).toHaveLength(1);
        expect(result.data.humanReviewReason).toBe("Security concern");
      }
    });

    it("should accept all summary values", () => {
      const summaries = [
        "approve",
        "request_changes",
        "needs_discussion",
      ] as const;

      summaries.forEach((summary) => {
        const result = ReviewResultSchema.safeParse({
          summary,
          overview: "Test",
          feedback: [],
          positives: [],
          questions: [],
          requiresHumanReview: false,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("when validating invalid input", () => {
    it("should reject invalid summary value", () => {
      const input = {
        summary: "rejected",
        overview: "Test",
        feedback: [],
        positives: [],
        questions: [],
        requiresHumanReview: false,
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const input = {
        summary: "approve",
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid feedback item in array", () => {
      const input = {
        summary: "approve",
        overview: "Test",
        feedback: [{ invalid: "item" }],
        positives: [],
        questions: [],
        requiresHumanReview: false,
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject non-boolean requiresHumanReview", () => {
      const input = {
        summary: "approve",
        overview: "Test",
        feedback: [],
        positives: [],
        questions: [],
        requiresHumanReview: "yes",
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings in arrays", () => {
      const input = {
        summary: "approve",
        overview: "",
        feedback: [],
        positives: [""],
        questions: [""],
        requiresHumanReview: false,
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should handle multiple feedback items", () => {
      const input = {
        summary: "request_changes",
        overview: "Multiple issues",
        feedback: [
          { severity: "blocker", file: "a.ts", message: "Issue 1" },
          { severity: "suggestion", file: "b.ts", message: "Issue 2" },
          { severity: "nitpick", file: "c.ts", message: "Issue 3" },
        ],
        positives: [],
        questions: [],
        requiresHumanReview: false,
      };

      const result = ReviewResultSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.feedback).toHaveLength(3);
      }
    });
  });
});
