/**
 * Tests for the Development Agent
 */

import { describe, it, expect } from "vitest";
import {
  createDeveloperAgent,
  formatGenerationResult,
  formatAnalysisResult,
  ChangeType,
  Confidence,
  PatternType,
  RefactoringType,
  CodeChangeSchema,
  DetectedPatternSchema,
  RefactoringSuggestionSchema,
  GeneratedFileSchema,
  CodeGenerationResultSchema,
  CodeAnalysisResultSchema,
  type CodeGenerationResult,
  type CodeAnalysisResult,
  type CodeChange,
  type DetectedPattern,
  type RefactoringSuggestion,
  type GeneratedFile,
  type DeveloperConfig,
} from "./index.js";

describe("Development Agent", () => {
  describe("createDeveloperAgent", () => {
    it("should create agent with default configuration", () => {
      const agent = createDeveloperAgent();

      expect(agent.name).toBe("Developer");
      expect(agent.role).toBe("Development Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createDeveloperAgent();

      expect(agent.capabilities.canModifyFiles).toBe(true);
      expect(agent.capabilities.canExecuteCommands).toBe(true);
      expect(agent.capabilities.canAccessNetwork).toBe(false);
      expect(agent.capabilities.requiresHumanApproval).toBe(true);
    });

    it("should have default config values", () => {
      const agent = createDeveloperAgent();

      expect(agent.config.includeTestSuggestions).toBe(true);
      expect(agent.config.detectPatterns).toBe(true);
      expect(agent.config.suggestRefactorings).toBe(true);
      expect(agent.config.analyzeComplexity).toBe(true);
      expect(agent.config.languages).toEqual(["typescript", "javascript"]);
      expect(agent.config.maxFileLines).toBe(2000);
      expect(agent.config.outputFormat).toBe("markdown");
    });

    it("should allow config overrides", () => {
      const customConfig: Partial<DeveloperConfig> = {
        languages: ["typescript", "python", "rust"],
        maxFileLines: 5000,
        outputFormat: "json",
      };

      const agent = createDeveloperAgent(customConfig);

      expect(agent.config.languages).toEqual(["typescript", "python", "rust"]);
      expect(agent.config.maxFileLines).toBe(5000);
      expect(agent.config.outputFormat).toBe("json");
      // Defaults should still apply for non-overridden values
      expect(agent.config.includeTestSuggestions).toBe(true);
      expect(agent.config.detectPatterns).toBe(true);
    });

    it("should preserve partial overrides correctly", () => {
      const agent = createDeveloperAgent({
        detectPatterns: false,
        suggestRefactorings: false,
      });

      expect(agent.config.detectPatterns).toBe(false);
      expect(agent.config.suggestRefactorings).toBe(false);
      expect(agent.config.includeTestSuggestions).toBe(true);
      expect(agent.config.analyzeComplexity).toBe(true);
    });
  });

  describe("Type Constants", () => {
    it("should have correct ChangeType values", () => {
      expect(ChangeType.ADD).toBe("add");
      expect(ChangeType.MODIFY).toBe("modify");
      expect(ChangeType.DELETE).toBe("delete");
      expect(ChangeType.REFACTOR).toBe("refactor");
    });

    it("should have correct Confidence values", () => {
      expect(Confidence.HIGH).toBe("high");
      expect(Confidence.MEDIUM).toBe("medium");
      expect(Confidence.LOW).toBe("low");
    });

    it("should have correct PatternType values", () => {
      expect(PatternType.DESIGN_PATTERN).toBe("design_pattern");
      expect(PatternType.ANTI_PATTERN).toBe("anti_pattern");
      expect(PatternType.CODE_SMELL).toBe("code_smell");
      expect(PatternType.BEST_PRACTICE).toBe("best_practice");
      expect(PatternType.CONVENTION).toBe("convention");
    });

    it("should have correct RefactoringType values", () => {
      expect(RefactoringType.EXTRACT_FUNCTION).toBe("extract_function");
      expect(RefactoringType.EXTRACT_VARIABLE).toBe("extract_variable");
      expect(RefactoringType.INLINE).toBe("inline");
      expect(RefactoringType.RENAME).toBe("rename");
      expect(RefactoringType.MOVE).toBe("move");
      expect(RefactoringType.SIMPLIFY).toBe("simplify");
      expect(RefactoringType.DECOMPOSE).toBe("decompose");
    });
  });

  describe("Zod Schemas", () => {
    describe("CodeChangeSchema", () => {
      it("should validate a valid code change", () => {
        const change: CodeChange = {
          id: "CHG-001",
          type: "add",
          file: "src/utils.ts",
          description: "Add utility function",
          after: "export function helper() {}",
          confidence: "high",
          rationale: "Needed for feature X",
        };

        const result = CodeChangeSchema.safeParse(change);
        expect(result.success).toBe(true);
      });

      it("should accept optional before, startLine, endLine", () => {
        const change: CodeChange = {
          id: "CHG-002",
          type: "modify",
          file: "src/main.ts",
          description: "Update function signature",
          before: "function old() {}",
          after: "function new() {}",
          startLine: 10,
          endLine: 15,
          confidence: "medium",
          rationale: "Better API design",
        };

        const result = CodeChangeSchema.safeParse(change);
        expect(result.success).toBe(true);
      });

      it("should reject invalid type", () => {
        const invalid = {
          id: "CHG-001",
          type: "invalid",
          file: "test.ts",
          description: "Test",
          after: "code",
          confidence: "high",
          rationale: "Test",
        };

        const result = CodeChangeSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should reject invalid confidence", () => {
        const invalid = {
          id: "CHG-001",
          type: "add",
          file: "test.ts",
          description: "Test",
          after: "code",
          confidence: "invalid",
          rationale: "Test",
        };

        const result = CodeChangeSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("DetectedPatternSchema", () => {
      it("should validate a valid pattern", () => {
        const pattern: DetectedPattern = {
          id: "PAT-001",
          type: "design_pattern",
          name: "Factory Pattern",
          file: "src/factory.ts",
          startLine: 10,
          endLine: 30,
          description: "Implements factory pattern for creating agents",
        };

        const result = DetectedPatternSchema.safeParse(pattern);
        expect(result.success).toBe(true);
      });

      it("should accept optional recommendation and severity", () => {
        const pattern: DetectedPattern = {
          id: "PAT-002",
          type: "code_smell",
          name: "Long Function",
          file: "src/utils.ts",
          startLine: 50,
          endLine: 200,
          description: "Function exceeds 150 lines",
          recommendation: "Consider extracting helper functions",
          severity: "warning",
        };

        const result = DetectedPatternSchema.safeParse(pattern);
        expect(result.success).toBe(true);
      });

      it("should reject invalid type", () => {
        const invalid = {
          id: "PAT-001",
          type: "invalid_type",
          name: "Test",
          file: "test.ts",
          startLine: 1,
          endLine: 10,
          description: "Test",
        };

        const result = DetectedPatternSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should reject invalid severity", () => {
        const invalid = {
          id: "PAT-001",
          type: "code_smell",
          name: "Test",
          file: "test.ts",
          startLine: 1,
          endLine: 10,
          description: "Test",
          severity: "critical",
        };

        const result = DetectedPatternSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("RefactoringSuggestionSchema", () => {
      it("should validate a valid refactoring suggestion", () => {
        const suggestion: RefactoringSuggestion = {
          id: "REF-001",
          type: "extract_function",
          file: "src/complex.ts",
          startLine: 20,
          endLine: 50,
          description: "Extract validation logic into separate function",
          benefit: "Improves readability and testability",
          effort: "small",
        };

        const result = RefactoringSuggestionSchema.safeParse(suggestion);
        expect(result.success).toBe(true);
      });

      it("should accept optional before and after", () => {
        const suggestion: RefactoringSuggestion = {
          id: "REF-002",
          type: "simplify",
          file: "src/logic.ts",
          startLine: 10,
          endLine: 20,
          description: "Simplify conditional logic",
          benefit: "Reduces cognitive complexity",
          effort: "trivial",
          before: "if (a && b || c && d) {}",
          after: "if (shouldProcess()) {}",
        };

        const result = RefactoringSuggestionSchema.safeParse(suggestion);
        expect(result.success).toBe(true);
      });

      it("should reject invalid refactoring type", () => {
        const invalid = {
          id: "REF-001",
          type: "invalid_type",
          file: "test.ts",
          startLine: 1,
          endLine: 10,
          description: "Test",
          benefit: "Test",
          effort: "small",
        };

        const result = RefactoringSuggestionSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should reject invalid effort", () => {
        const invalid = {
          id: "REF-001",
          type: "extract_function",
          file: "test.ts",
          startLine: 1,
          endLine: 10,
          description: "Test",
          benefit: "Test",
          effort: "huge",
        };

        const result = RefactoringSuggestionSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("GeneratedFileSchema", () => {
      it("should validate a valid generated file", () => {
        const file: GeneratedFile = {
          path: "src/new-feature.ts",
          content: "export function feature() {}",
          type: "add",
          language: "typescript",
          description: "New feature implementation",
        };

        const result = GeneratedFileSchema.safeParse(file);
        expect(result.success).toBe(true);
      });

      it("should validate all file types", () => {
        const types = ["add", "modify", "delete"] as const;
        for (const type of types) {
          const file: GeneratedFile = {
            path: "test.ts",
            content: "",
            type,
            language: "typescript",
            description: "Test",
          };
          const result = GeneratedFileSchema.safeParse(file);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid file type", () => {
        const invalid = {
          path: "test.ts",
          content: "",
          type: "invalid",
          language: "typescript",
          description: "Test",
        };

        const result = GeneratedFileSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("CodeGenerationResultSchema", () => {
      it("should validate a minimal result", () => {
        const result: CodeGenerationResult = {
          title: "Feature X",
          summary: "Implement feature X",
          generatedAt: "2026-03-13T12:00:00Z",
          specification: "specs/feature-x.md",
          files: [],
          changes: [],
          patterns: [],
          dependencies: [],
          testSuggestions: [],
          confidence: "high",
          requiresHumanReview: false,
        };

        const parseResult = CodeGenerationResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });

      it("should validate a fully populated result", () => {
        const result: CodeGenerationResult = {
          title: "User Authentication",
          summary: "Implement user authentication flow",
          generatedAt: "2026-03-13T12:00:00Z",
          specification: "specs/auth.md",
          files: [
            {
              path: "src/auth/login.ts",
              content: "export function login() {}",
              type: "add",
              language: "typescript",
              description: "Login function",
            },
          ],
          changes: [
            {
              id: "CHG-001",
              type: "add",
              file: "src/auth/login.ts",
              description: "Add login function",
              after: "export function login() {}",
              confidence: "high",
              rationale: "Required for auth",
            },
          ],
          patterns: [
            {
              id: "PAT-001",
              type: "best_practice",
              name: "Separation of Concerns",
              file: "src/auth/login.ts",
              startLine: 1,
              endLine: 20,
              description: "Auth logic isolated",
            },
          ],
          dependencies: ["bcrypt", "jsonwebtoken"],
          testSuggestions: ["Test login success", "Test login failure"],
          confidence: "high",
          requiresHumanReview: true,
          humanReviewReason: "Security-sensitive code",
        };

        const parseResult = CodeGenerationResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });
    });

    describe("CodeAnalysisResultSchema", () => {
      it("should validate a minimal result", () => {
        const result: CodeAnalysisResult = {
          file: "src/utils.ts",
          analyzedAt: "2026-03-13T12:00:00Z",
          linesAnalyzed: 100,
          patterns: [],
          refactorings: [],
          complexity: {
            linesOfCode: 100,
            functions: 5,
            classes: 1,
          },
          recommendations: [],
        };

        const parseResult = CodeAnalysisResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });

      it("should validate with optional complexity metrics", () => {
        const result: CodeAnalysisResult = {
          file: "src/complex.ts",
          analyzedAt: "2026-03-13T12:00:00Z",
          linesAnalyzed: 500,
          patterns: [],
          refactorings: [],
          complexity: {
            cyclomatic: 25,
            cognitive: 30,
            linesOfCode: 500,
            functions: 20,
            classes: 3,
          },
          recommendations: ["Consider splitting this file"],
        };

        const parseResult = CodeAnalysisResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });
    });
  });

  describe("formatGenerationResult", () => {
    const minimalResult: CodeGenerationResult = {
      title: "Test Feature",
      summary: "A test feature for formatting",
      generatedAt: "2026-03-13T12:00:00Z",
      specification: "test.md",
      files: [],
      changes: [],
      patterns: [],
      dependencies: [],
      testSuggestions: [],
      confidence: "high",
      requiresHumanReview: false,
    };

    it("should format header correctly", () => {
      const output = formatGenerationResult(minimalResult);

      expect(output).toContain("# Code Generation: Test Feature");
      expect(output).toContain("**Generated:** 2026-03-13T12:00:00Z");
      expect(output).toContain("**Specification:** `test.md`");
      expect(output).toContain("**Overall Confidence:** High");
    });

    it("should include summary section", () => {
      const output = formatGenerationResult(minimalResult);

      expect(output).toContain("## Summary");
      expect(output).toContain("A test feature for formatting");
    });

    it("should format generated files with table", () => {
      const resultWithFiles: CodeGenerationResult = {
        ...minimalResult,
        files: [
          {
            path: "src/feature.ts",
            content: "export function feature() {\n  return true;\n}",
            type: "add",
            language: "typescript",
            description: "Main feature file",
          },
          {
            path: "src/utils.ts",
            content: "export const helper = () => {}",
            type: "modify",
            language: "typescript",
            description: "Utility helpers",
          },
        ],
      };

      const output = formatGenerationResult(resultWithFiles);

      expect(output).toContain("## Generated Files");
      expect(output).toContain("| Path | Type | Language | Description |");
      expect(output).toContain("`src/feature.ts`");
      expect(output).toContain("[+] add");
      expect(output).toContain("[~] modify");
      expect(output).toContain("### File Contents");
      expect(output).toContain("#### `src/feature.ts`");
      expect(output).toContain("```typescript");
      expect(output).toContain("export function feature()");
    });

    it("should format code changes", () => {
      const resultWithChanges: CodeGenerationResult = {
        ...minimalResult,
        changes: [
          {
            id: "CHG-001",
            type: "add",
            file: "src/new.ts",
            description: "Add new function",
            after: "function newFunc() {}",
            confidence: "high",
            rationale: "Required for feature",
          },
          {
            id: "CHG-002",
            type: "modify",
            file: "src/existing.ts",
            description: "Update existing function",
            before: "function old() {}",
            after: "function updated() {}",
            startLine: 10,
            endLine: 15,
            confidence: "medium",
            rationale: "Better implementation",
          },
        ],
      };

      const output = formatGenerationResult(resultWithChanges);

      expect(output).toContain("## Code Changes");
      expect(output).toContain("### [+] Add new function");
      expect(output).toContain("**File:** `src/new.ts`");
      expect(output).toContain("**Confidence:** +++ high");
      expect(output).toContain("**Rationale:** Required for feature");
      expect(output).toContain("**After:**");

      expect(output).toContain("### [~] Update existing function");
      expect(output).toContain("**Lines:** 10-15");
      expect(output).toContain("**Confidence:** ++ medium");
      expect(output).toContain("**Before:**");
      expect(output).toContain("function old() {}");
    });

    it("should format detected patterns", () => {
      const resultWithPatterns: CodeGenerationResult = {
        ...minimalResult,
        patterns: [
          {
            id: "PAT-001",
            type: "design_pattern",
            name: "Factory Pattern",
            file: "src/factory.ts",
            startLine: 1,
            endLine: 50,
            description: "Creates objects dynamically",
          },
          {
            id: "PAT-002",
            type: "best_practice",
            name: "Immutability",
            file: "src/state.ts",
            startLine: 10,
            endLine: 20,
            description: "Uses immutable data structures",
          },
          {
            id: "PAT-003",
            type: "code_smell",
            name: "Long Function",
            file: "src/complex.ts",
            startLine: 50,
            endLine: 200,
            description: "Function is too long",
            recommendation: "Extract helper functions",
            severity: "warning",
          },
          {
            id: "PAT-004",
            type: "anti_pattern",
            name: "God Object",
            file: "src/main.ts",
            startLine: 1,
            endLine: 500,
            description: "Class does too much",
            recommendation: "Split responsibilities",
            severity: "error",
          },
        ],
      };

      const output = formatGenerationResult(resultWithPatterns);

      expect(output).toContain("## Detected Patterns");
      expect(output).toContain("### Good Patterns");
      expect(output).toContain("**Factory Pattern**");
      expect(output).toContain("**Immutability**");
      expect(output).toContain("### Issues to Address");
      expect(output).toContain("[?] **Long Function**");
      expect(output).toContain("[!] **God Object**");
      expect(output).toContain("Recommendation: Extract helper functions");
    });

    it("should format dependencies", () => {
      const resultWithDeps: CodeGenerationResult = {
        ...minimalResult,
        dependencies: ["zod", "lodash", "axios"],
      };

      const output = formatGenerationResult(resultWithDeps);

      expect(output).toContain("## Dependencies");
      expect(output).toContain("- zod");
      expect(output).toContain("- lodash");
      expect(output).toContain("- axios");
    });

    it("should format test suggestions as checkboxes", () => {
      const resultWithTests: CodeGenerationResult = {
        ...minimalResult,
        testSuggestions: [
          "Test happy path",
          "Test error handling",
          "Test edge cases",
        ],
      };

      const output = formatGenerationResult(resultWithTests);

      expect(output).toContain("## Test Suggestions");
      expect(output).toContain("- [ ] Test happy path");
      expect(output).toContain("- [ ] Test error handling");
      expect(output).toContain("- [ ] Test edge cases");
    });

    it("should show human review notice when required", () => {
      const resultNeedsReview: CodeGenerationResult = {
        ...minimalResult,
        requiresHumanReview: true,
        humanReviewReason: "Security-sensitive changes",
      };

      const output = formatGenerationResult(resultNeedsReview);

      expect(output).toContain("---");
      expect(output).toContain("**Human review required**");
      expect(output).toContain("Security-sensitive changes");
    });

    it("should show default reason when humanReviewReason is missing", () => {
      const resultNeedsReview: CodeGenerationResult = {
        ...minimalResult,
        requiresHumanReview: true,
      };

      const output = formatGenerationResult(resultNeedsReview);

      expect(output).toContain("Code changes need validation");
    });

    it("should not show human review notice when not required", () => {
      const output = formatGenerationResult(minimalResult);

      expect(output).not.toContain("Human review required");
    });

    it("should format all confidence levels correctly", () => {
      const confidenceLevels = ["high", "medium", "low"] as const;

      for (const confidence of confidenceLevels) {
        const result: CodeGenerationResult = {
          ...minimalResult,
          confidence,
        };

        const output = formatGenerationResult(result);
        const expectedLabel =
          confidence.charAt(0).toUpperCase() + confidence.slice(1);

        expect(output).toContain(`**Overall Confidence:** ${expectedLabel}`);
      }
    });

    it("should format all change types with correct icons", () => {
      const types = [
        { type: "add" as const, icon: "[+]" },
        { type: "modify" as const, icon: "[~]" },
        { type: "delete" as const, icon: "[-]" },
        { type: "refactor" as const, icon: "[R]" },
      ];

      for (const { type, icon } of types) {
        const result: CodeGenerationResult = {
          ...minimalResult,
          changes: [
            {
              id: "CHG-001",
              type,
              file: "test.ts",
              description: `${type} change`,
              after: "code",
              confidence: "high",
              rationale: "test",
            },
          ],
        };

        const output = formatGenerationResult(result);
        expect(output).toContain(`### ${icon} ${type} change`);
      }
    });
  });

  describe("formatAnalysisResult", () => {
    const minimalResult: CodeAnalysisResult = {
      file: "src/utils.ts",
      analyzedAt: "2026-03-13T12:00:00Z",
      linesAnalyzed: 100,
      patterns: [],
      refactorings: [],
      complexity: {
        linesOfCode: 100,
        functions: 5,
        classes: 1,
      },
      recommendations: [],
    };

    it("should format header correctly", () => {
      const output = formatAnalysisResult(minimalResult);

      expect(output).toContain("# Code Analysis: `src/utils.ts`");
      expect(output).toContain("**Analyzed:** 2026-03-13T12:00:00Z");
      expect(output).toContain("**Lines:** 100");
    });

    it("should format complexity metrics", () => {
      const output = formatAnalysisResult(minimalResult);

      expect(output).toContain("## Complexity Metrics");
      expect(output).toContain("| Metric | Value |");
      expect(output).toContain("| Lines of Code | 100 |");
      expect(output).toContain("| Functions | 5 |");
      expect(output).toContain("| Classes | 1 |");
    });

    it("should include optional complexity metrics when present", () => {
      const resultWithFullComplexity: CodeAnalysisResult = {
        ...minimalResult,
        complexity: {
          cyclomatic: 15,
          cognitive: 20,
          linesOfCode: 200,
          functions: 10,
          classes: 2,
        },
      };

      const output = formatAnalysisResult(resultWithFullComplexity);

      expect(output).toContain("| Cyclomatic Complexity | 15 |");
      expect(output).toContain("| Cognitive Complexity | 20 |");
    });

    it("should format detected patterns", () => {
      const resultWithPatterns: CodeAnalysisResult = {
        ...minimalResult,
        patterns: [
          {
            id: "PAT-001",
            type: "design_pattern",
            name: "Singleton",
            file: "src/utils.ts",
            startLine: 10,
            endLine: 30,
            description: "Implements singleton pattern",
            recommendation: "Consider dependency injection instead",
            severity: "info",
          },
        ],
      };

      const output = formatAnalysisResult(resultWithPatterns);

      expect(output).toContain("## Detected Patterns");
      expect(output).toContain("### [DP] Singleton ([i])");
      expect(output).toContain("**Location:** Lines 10-30");
      expect(output).toContain("Implements singleton pattern");
      expect(output).toContain(
        "**Recommendation:** Consider dependency injection instead",
      );
    });

    it("should format all pattern type icons", () => {
      const patternTypes = [
        { type: "design_pattern" as const, icon: "[DP]" },
        { type: "anti_pattern" as const, icon: "[AP]" },
        { type: "code_smell" as const, icon: "[CS]" },
        { type: "best_practice" as const, icon: "[BP]" },
        { type: "convention" as const, icon: "[CV]" },
      ];

      for (const { type, icon } of patternTypes) {
        const result: CodeAnalysisResult = {
          ...minimalResult,
          patterns: [
            {
              id: "PAT-001",
              type,
              name: "Test Pattern",
              file: "test.ts",
              startLine: 1,
              endLine: 10,
              description: "Test description",
            },
          ],
        };

        const output = formatAnalysisResult(result);
        expect(output).toContain(`### ${icon} Test Pattern`);
      }
    });

    it("should format refactoring suggestions grouped by effort", () => {
      const resultWithRefactorings: CodeAnalysisResult = {
        ...minimalResult,
        refactorings: [
          {
            id: "REF-001",
            type: "extract_function",
            file: "src/utils.ts",
            startLine: 10,
            endLine: 50,
            description: "Extract validation logic",
            benefit: "Improves testability",
            effort: "small",
            before: "inline validation code",
            after: "validateInput(data)",
          },
          {
            id: "REF-002",
            type: "simplify",
            file: "src/utils.ts",
            startLine: 60,
            endLine: 65,
            description: "Simplify conditional",
            benefit: "Reduces complexity",
            effort: "trivial",
          },
          {
            id: "REF-003",
            type: "decompose",
            file: "src/utils.ts",
            startLine: 100,
            endLine: 200,
            description: "Break up large function",
            benefit: "Better maintainability",
            effort: "large",
          },
        ],
      };

      const output = formatAnalysisResult(resultWithRefactorings);

      expect(output).toContain("## Refactoring Opportunities");
      expect(output).toContain("### Trivial Effort");
      expect(output).toContain("### Small Effort");
      expect(output).toContain("### Large Effort");
      expect(output).toContain("[EF] Extract validation logic");
      expect(output).toContain("[SM] Simplify conditional");
      expect(output).toContain("[DC] Break up large function");
      expect(output).toContain("**Benefit:** Improves testability");
      expect(output).toContain("**Before:**");
      expect(output).toContain("**After:**");
    });

    it("should format all refactoring type icons", () => {
      const refactoringTypes = [
        { type: "extract_function" as const, icon: "[EF]" },
        { type: "extract_variable" as const, icon: "[EV]" },
        { type: "inline" as const, icon: "[IN]" },
        { type: "rename" as const, icon: "[RN]" },
        { type: "move" as const, icon: "[MV]" },
        { type: "simplify" as const, icon: "[SM]" },
        { type: "decompose" as const, icon: "[DC]" },
      ];

      for (const { type, icon } of refactoringTypes) {
        const result: CodeAnalysisResult = {
          ...minimalResult,
          refactorings: [
            {
              id: "REF-001",
              type,
              file: "test.ts",
              startLine: 1,
              endLine: 10,
              description: "Test refactoring",
              benefit: "Test benefit",
              effort: "small",
            },
          ],
        };

        const output = formatAnalysisResult(result);
        expect(output).toContain(`${icon} Test refactoring`);
      }
    });

    it("should format recommendations", () => {
      const resultWithRecs: CodeAnalysisResult = {
        ...minimalResult,
        recommendations: [
          "Add more unit tests",
          "Consider splitting this file",
          "Document public API",
        ],
      };

      const output = formatAnalysisResult(resultWithRecs);

      expect(output).toContain("## Recommendations");
      expect(output).toContain("- Add more unit tests");
      expect(output).toContain("- Consider splitting this file");
      expect(output).toContain("- Document public API");
    });

    it("should handle empty sections gracefully", () => {
      const output = formatAnalysisResult(minimalResult);

      // Should have complexity section
      expect(output).toContain("## Complexity Metrics");

      // Should not have empty sections
      expect(output).not.toContain("## Detected Patterns\n\n##");
      expect(output).not.toContain("## Refactoring Opportunities\n\n##");
      expect(output).not.toContain("## Recommendations\n\n##");
    });

    it("should skip effort groups with no refactorings", () => {
      const resultWithOneEffort: CodeAnalysisResult = {
        ...minimalResult,
        refactorings: [
          {
            id: "REF-001",
            type: "simplify",
            file: "test.ts",
            startLine: 1,
            endLine: 10,
            description: "Quick fix",
            benefit: "Small improvement",
            effort: "trivial",
          },
        ],
      };

      const output = formatAnalysisResult(resultWithOneEffort);

      expect(output).toContain("### Trivial Effort");
      expect(output).not.toContain("### Small Effort");
      expect(output).not.toContain("### Medium Effort");
      expect(output).not.toContain("### Large Effort");
    });
  });

  describe("Edge Cases", () => {
    it("should handle result with only files, no changes", () => {
      const result: CodeGenerationResult = {
        title: "Files Only",
        summary: "Just files",
        generatedAt: "2026-03-13",
        specification: "spec.md",
        files: [
          {
            path: "src/new.ts",
            content: "export const x = 1",
            type: "add",
            language: "typescript",
            description: "New file",
          },
        ],
        changes: [],
        patterns: [],
        dependencies: [],
        testSuggestions: [],
        confidence: "high",
        requiresHumanReview: false,
      };

      const output = formatGenerationResult(result);

      expect(output).toContain("## Generated Files");
      expect(output).not.toContain("## Code Changes");
    });

    it("should handle pattern without recommendation", () => {
      const result: CodeAnalysisResult = {
        file: "test.ts",
        analyzedAt: "2026-03-13",
        linesAnalyzed: 50,
        patterns: [
          {
            id: "PAT-001",
            type: "design_pattern",
            name: "Observer",
            file: "test.ts",
            startLine: 1,
            endLine: 50,
            description: "Implements observer pattern",
          },
        ],
        refactorings: [],
        complexity: {
          linesOfCode: 50,
          functions: 3,
          classes: 1,
        },
        recommendations: [],
      };

      const output = formatAnalysisResult(result);

      expect(output).toContain("Observer");
      expect(output).not.toContain("**Recommendation:**");
    });

    it("should handle refactoring without before/after", () => {
      const result: CodeAnalysisResult = {
        file: "test.ts",
        analyzedAt: "2026-03-13",
        linesAnalyzed: 50,
        patterns: [],
        refactorings: [
          {
            id: "REF-001",
            type: "rename",
            file: "test.ts",
            startLine: 10,
            endLine: 10,
            description: "Rename variable for clarity",
            benefit: "Better readability",
            effort: "trivial",
          },
        ],
        complexity: {
          linesOfCode: 50,
          functions: 3,
          classes: 1,
        },
        recommendations: [],
      };

      const output = formatAnalysisResult(result);

      expect(output).toContain("[RN] Rename variable for clarity");
      expect(output).toContain("**Benefit:** Better readability");
      expect(output).not.toContain("**Before:**");
      expect(output).not.toContain("**After:**");
    });

    it("should handle change without line numbers", () => {
      const result: CodeGenerationResult = {
        title: "No Lines",
        summary: "Change without line numbers",
        generatedAt: "2026-03-13",
        specification: "spec.md",
        files: [],
        changes: [
          {
            id: "CHG-001",
            type: "add",
            file: "new-file.ts",
            description: "Add entire file",
            after: "content",
            confidence: "high",
            rationale: "New file",
          },
        ],
        patterns: [],
        dependencies: [],
        testSuggestions: [],
        confidence: "high",
        requiresHumanReview: false,
      };

      const output = formatGenerationResult(result);

      expect(output).toContain("**File:** `new-file.ts`");
      expect(output).not.toContain("**Lines:**");
    });

    it("should format severity icons correctly", () => {
      const severities = [
        { severity: "error" as const, icon: "[!]" },
        { severity: "warning" as const, icon: "[?]" },
        { severity: "info" as const, icon: "[i]" },
      ];

      for (const { severity, icon } of severities) {
        const result: CodeGenerationResult = {
          title: "Severity Test",
          summary: "Testing severity",
          generatedAt: "2026-03-13",
          specification: "spec.md",
          files: [],
          changes: [],
          patterns: [
            {
              id: "PAT-001",
              type: "code_smell",
              name: "Test Issue",
              file: "test.ts",
              startLine: 1,
              endLine: 10,
              description: "Description",
              severity,
            },
          ],
          dependencies: [],
          testSuggestions: [],
          confidence: "high",
          requiresHumanReview: false,
        };

        const output = formatGenerationResult(result);
        expect(output).toContain(`${icon} **Test Issue**`);
      }
    });
  });
});
