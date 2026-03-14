import { describe, it, expect } from "vitest";

import {
  createDocumenterAgent,
  formatDocReport,
  formatAuditReport,
  DocPriority,
  DocItemType,
  DocStatus,
  DocItemSchema,
  JSDocEntrySchema,
  ReadmeSectionSchema,
  DocAuditReportSchema,
  DocReportSchema,
} from "./index.js";
import type {
  DocReport,
  DocAuditReport,
  DocItem,
  JSDocEntry,
  ReadmeSection,
} from "./index.js";

describe("createDocumenterAgent", () => {
  describe("when called with no config", () => {
    it("should return agent with default values", () => {
      const agent = createDocumenterAgent();

      expect(agent.name).toBe("Documenter");
      expect(agent.role).toBe("Documentation Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createDocumenterAgent();

      expect(agent.capabilities).toEqual({
        canModifyFiles: true,
        canExecuteCommands: false,
        canAccessNetwork: false,
        requiresHumanApproval: false,
      });
    });

    it("should have default config values", () => {
      const agent = createDocumenterAgent();

      expect(agent.config.includePrivate).toBe(false);
      expect(agent.config.generateExamples).toBe(true);
      expect(agent.config.auditReadme).toBe(true);
      expect(agent.config.outputFormat).toBe("markdown");
      expect(agent.config.includePatterns).toContain("**/*.ts");
      expect(agent.config.excludePatterns).toContain("*.d.ts");
      expect(agent.config.excludePatterns).toContain("node_modules/**");
    });
  });

  describe("when called with config overrides", () => {
    it("should merge overrides with defaults", () => {
      const agent = createDocumenterAgent({
        includePrivate: true,
      });

      expect(agent.config.includePrivate).toBe(true);
      expect(agent.config.generateExamples).toBe(true); // default preserved
    });

    it("should allow overriding all config options", () => {
      const customConfig = {
        includePrivate: true,
        generateExamples: false,
        auditReadme: false,
        includePatterns: ["**/*.js"],
        excludePatterns: ["custom/**"],
        outputFormat: "json" as const,
      };

      const agent = createDocumenterAgent(customConfig);

      expect(agent.config).toEqual(customConfig);
    });

    it("should not mutate default config", () => {
      const agent1 = createDocumenterAgent({ includePrivate: true });
      const agent2 = createDocumenterAgent();

      expect(agent1.config.includePrivate).toBe(true);
      expect(agent2.config.includePrivate).toBe(false);
    });
  });
});

describe("formatDocReport", () => {
  const baseReport: DocReport = {
    targetPath: "src/utils.ts",
    generatedAt: "2024-01-15T10:00:00Z",
    mode: "generate",
    filesProcessed: 1,
    jsDocEntries: [],
    readmeSections: [],
    gaps: [],
    suggestions: [],
    requiresHumanReview: false,
  };

  const sampleJSDocEntry: JSDocEntry = {
    functionName: "validateInput",
    file: "src/utils.ts",
    line: 10,
    generatedDoc: "/**\n * Validates user input\n */",
    params: [
      { name: "input", type: "string", description: "The input to validate" },
    ],
    returns: { type: "boolean", description: "True if valid" },
    examples: ['validateInput("test")'],
  };

  const sampleDocItem: DocItem = {
    name: "helperFn",
    type: "jsdoc",
    file: "src/helpers.ts",
    line: 25,
    status: "missing",
    priority: "high",
    description: "No JSDoc comment found",
  };

  describe("header section", () => {
    it("should include report title", () => {
      const result = formatDocReport(baseReport);

      expect(result).toContain("# Documentation Report");
    });

    it("should include target path", () => {
      const result = formatDocReport(baseReport);

      expect(result).toContain("**Target:** `src/utils.ts`");
    });

    it("should include mode", () => {
      const result = formatDocReport(baseReport);

      expect(result).toContain("**Mode:** generate");
    });

    it("should include generation timestamp", () => {
      const result = formatDocReport(baseReport);

      expect(result).toContain("**Generated:** 2024-01-15T10:00:00Z");
    });

    it("should include files processed count", () => {
      const result = formatDocReport(baseReport);

      expect(result).toContain("**Files Processed:** 1");
    });
  });

  describe("summary section", () => {
    it("should show JSDoc entries count", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("**JSDoc Entries:** 1");
    });

    it("should show README sections count", () => {
      const section: ReadmeSection = {
        heading: "Installation",
        status: "complete",
        reason: "Section exists and is up-to-date",
      };
      const result = formatDocReport({
        ...baseReport,
        readmeSections: [section],
      });

      expect(result).toContain("**README Sections:** 1");
    });

    it("should show documentation gaps count", () => {
      const result = formatDocReport({
        ...baseReport,
        gaps: [sampleDocItem],
      });

      expect(result).toContain("**Documentation Gaps:** 1");
    });
  });

  describe("JSDoc entries section", () => {
    it("should display JSDoc entries with function name", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("## JSDoc Entries");
      expect(result).toContain("`validateInput`");
    });

    it("should show file and line location", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("**File:** `src/utils.ts:10`");
    });

    it("should show new entry icon for entries without original doc", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("✨");
    });

    it("should show update icon for entries with original doc", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [{ ...sampleJSDocEntry, originalDoc: "/** old doc */" }],
      });

      expect(result).toContain("📝");
    });

    it("should show parameters", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("**Parameters:**");
      expect(result).toContain("`input` (`string`): The input to validate");
    });

    it("should show return type", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("**Returns:** `boolean` — True if valid");
    });

    it("should show examples", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [sampleJSDocEntry],
      });

      expect(result).toContain("**Examples:**");
      expect(result).toContain('validateInput("test")');
    });

    it("should omit parameters section when empty", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [{ ...sampleJSDocEntry, params: [] }],
      });

      expect(result).not.toContain("**Parameters:**");
    });

    it("should omit returns section when undefined", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [{ ...sampleJSDocEntry, returns: undefined }],
      });

      expect(result).not.toContain("**Returns:**");
    });

    it("should omit examples section when empty", () => {
      const result = formatDocReport({
        ...baseReport,
        jsDocEntries: [{ ...sampleJSDocEntry, examples: [] }],
      });

      expect(result).not.toContain("**Examples:**");
    });
  });

  describe("README sections", () => {
    it("should display README sections with status icons", () => {
      const sections: ReadmeSection[] = [
        { heading: "Installation", status: "complete", reason: "Up-to-date" },
        { heading: "Usage", status: "missing", reason: "Section not found" },
      ];

      const result = formatDocReport({
        ...baseReport,
        readmeSections: sections,
      });

      expect(result).toContain("## README Sections");
      expect(result).toContain("✅");
      expect(result).toContain("**Installation**");
      expect(result).toContain("❌");
      expect(result).toContain("**Usage**");
    });
  });

  describe("documentation gaps section", () => {
    it("should group gaps by priority", () => {
      const gaps: DocItem[] = [
        { ...sampleDocItem, priority: "high", name: "highFn" },
        { ...sampleDocItem, priority: "medium", name: "medFn" },
        { ...sampleDocItem, priority: "low", name: "lowFn" },
      ];

      const result = formatDocReport({
        ...baseReport,
        gaps,
      });

      expect(result).toContain("## Documentation Gaps");
      expect(result).toContain("### 🔴 High Priority");
      expect(result).toContain("### 🟡 Medium Priority");
      expect(result).toContain("### 🟢 Low Priority");
    });

    it("should show status icon for each gap", () => {
      const result = formatDocReport({
        ...baseReport,
        gaps: [sampleDocItem],
      });

      expect(result).toContain("❌");
      expect(result).toContain("`helperFn`");
    });

    it("should show file location with line number", () => {
      const result = formatDocReport({
        ...baseReport,
        gaps: [sampleDocItem],
      });

      expect(result).toContain("File: `src/helpers.ts:25`");
    });

    it("should show file location without line when not provided", () => {
      const result = formatDocReport({
        ...baseReport,
        gaps: [{ ...sampleDocItem, line: undefined }],
      });

      expect(result).toContain("File: `src/helpers.ts`");
      expect(result).not.toContain("src/helpers.ts:");
    });

    it("should omit section when no gaps", () => {
      const result = formatDocReport(baseReport);

      expect(result).not.toContain("## Documentation Gaps");
    });
  });

  describe("suggestions section", () => {
    it("should list suggestions", () => {
      const result = formatDocReport({
        ...baseReport,
        suggestions: [
          "Add README installation section",
          "Document exported types",
        ],
      });

      expect(result).toContain("## Suggestions");
      expect(result).toContain("- Add README installation section");
      expect(result).toContain("- Document exported types");
    });

    it("should omit section when no suggestions", () => {
      const result = formatDocReport(baseReport);

      expect(result).not.toContain("## Suggestions");
    });
  });

  describe("human review notice", () => {
    it("should show notice with custom reason", () => {
      const result = formatDocReport({
        ...baseReport,
        requiresHumanReview: true,
        humanReviewReason: "Architecture documentation needed",
      });

      expect(result).toContain(
        "⚠️ **Human review required**: Architecture documentation needed",
      );
    });

    it("should show default reason when not provided", () => {
      const result = formatDocReport({
        ...baseReport,
        requiresHumanReview: true,
      });

      expect(result).toContain(
        "⚠️ **Human review required**: See suggestions above",
      );
    });

    it("should not show notice when not required", () => {
      const result = formatDocReport(baseReport);

      expect(result).not.toContain("Human review required");
    });
  });

  describe("different modes", () => {
    it("should display audit mode", () => {
      const result = formatDocReport({
        ...baseReport,
        mode: "audit",
      });

      expect(result).toContain("**Mode:** audit");
    });

    it("should display smart mode", () => {
      const result = formatDocReport({
        ...baseReport,
        mode: "smart",
      });

      expect(result).toContain("**Mode:** smart");
    });
  });
});

describe("formatAuditReport", () => {
  const baseAuditReport: DocAuditReport = {
    targetPath: "src/",
    generatedAt: "2024-01-15T10:00:00Z",
    totalItems: 10,
    documented: 7,
    missing: 2,
    outdated: 1,
    incomplete: 0,
    items: [],
    readmeSections: [],
    requiresHumanReview: false,
  };

  const sampleItem: DocItem = {
    name: "helperFn",
    type: "jsdoc",
    file: "src/helpers.ts",
    line: 25,
    status: "missing",
    priority: "high",
    description: "No JSDoc comment found",
  };

  describe("header section", () => {
    it("should include audit report title", () => {
      const result = formatAuditReport(baseAuditReport);

      expect(result).toContain("# Documentation Audit Report");
    });

    it("should include target path", () => {
      const result = formatAuditReport(baseAuditReport);

      expect(result).toContain("**Target:** `src/`");
    });
  });

  describe("coverage summary section", () => {
    it("should show coverage table", () => {
      const result = formatAuditReport(baseAuditReport);

      expect(result).toContain("## Coverage Summary");
      expect(result).toContain("| Total Items | 10 |");
      expect(result).toContain("| Documented | 7 (70%) |");
      expect(result).toContain("| Missing | 2 |");
      expect(result).toContain("| Outdated | 1 |");
      expect(result).toContain("| Incomplete | 0 |");
    });

    it("should handle zero total items", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        totalItems: 0,
        documented: 0,
      });

      expect(result).toContain("| Documented | 0 (0%) |");
    });
  });

  describe("items by status", () => {
    it("should group missing items", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        items: [{ ...sampleItem, status: "missing" }],
      });

      expect(result).toContain("## ❌ Missing Documentation");
      expect(result).toContain("`helperFn`");
    });

    it("should group outdated items", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        items: [{ ...sampleItem, status: "outdated" }],
      });

      expect(result).toContain("## ⚠️ Outdated Documentation");
    });

    it("should group incomplete items", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        items: [{ ...sampleItem, status: "incomplete" }],
      });

      expect(result).toContain("## 📝 Incomplete Documentation");
    });

    it("should group complete items", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        items: [{ ...sampleItem, status: "complete" }],
      });

      expect(result).toContain("## ✅ Well Documented");
    });

    it("should show priority icon for non-complete items", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        items: [
          { ...sampleItem, status: "missing", priority: "high" },
          {
            ...sampleItem,
            status: "outdated",
            priority: "medium",
            name: "fn2",
          },
          { ...sampleItem, status: "incomplete", priority: "low", name: "fn3" },
        ],
      });

      expect(result).toContain("🔴");
      expect(result).toContain("🟡");
      expect(result).toContain("🟢");
    });
  });

  describe("README analysis section", () => {
    it("should display README sections", () => {
      const sections: ReadmeSection[] = [
        { heading: "Installation", status: "complete", reason: "Up-to-date" },
        { heading: "API", status: "outdated", reason: "API changed" },
      ];

      const result = formatAuditReport({
        ...baseAuditReport,
        readmeSections: sections,
      });

      expect(result).toContain("## README Analysis");
      expect(result).toContain("✅");
      expect(result).toContain("**Installation**");
      expect(result).toContain("⚠️");
      expect(result).toContain("**API**");
    });
  });

  describe("human review notice", () => {
    it("should show notice with custom reason", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        requiresHumanReview: true,
        humanReviewReason: "Tutorial documentation needed",
      });

      expect(result).toContain(
        "⚠️ **Human review required**: Tutorial documentation needed",
      );
    });

    it("should show default reason when not provided", () => {
      const result = formatAuditReport({
        ...baseAuditReport,
        requiresHumanReview: true,
      });

      expect(result).toContain(
        "⚠️ **Human review required**: Some items require manual documentation",
      );
    });
  });
});

describe("Type constants", () => {
  describe("DocPriority", () => {
    it("should have correct values", () => {
      expect(DocPriority.HIGH).toBe("high");
      expect(DocPriority.MEDIUM).toBe("medium");
      expect(DocPriority.LOW).toBe("low");
    });
  });

  describe("DocItemType", () => {
    it("should have correct values", () => {
      expect(DocItemType.JSDOC).toBe("jsdoc");
      expect(DocItemType.README).toBe("readme");
      expect(DocItemType.MODULE).toBe("module");
      expect(DocItemType.API).toBe("api");
      expect(DocItemType.EXAMPLE).toBe("example");
    });
  });

  describe("DocStatus", () => {
    it("should have correct values", () => {
      expect(DocStatus.MISSING).toBe("missing");
      expect(DocStatus.OUTDATED).toBe("outdated");
      expect(DocStatus.INCOMPLETE).toBe("incomplete");
      expect(DocStatus.COMPLETE).toBe("complete");
    });
  });
});

describe("Zod schemas", () => {
  describe("DocItemSchema", () => {
    it("should validate correct doc item", () => {
      const valid = {
        name: "fn",
        type: "jsdoc",
        file: "src/test.ts",
        status: "missing",
        priority: "high",
        description: "No doc found",
      };

      const result = DocItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional line", () => {
      const valid = {
        name: "fn",
        type: "jsdoc",
        file: "src/test.ts",
        line: 10,
        status: "missing",
        priority: "high",
        description: "No doc found",
      };

      const result = DocItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional suggestedContent", () => {
      const valid = {
        name: "fn",
        type: "jsdoc",
        file: "src/test.ts",
        status: "missing",
        priority: "high",
        description: "No doc found",
        suggestedContent: "/** Doc */",
      };

      const result = DocItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid type", () => {
      const invalid = {
        name: "fn",
        type: "invalid",
        file: "src/test.ts",
        status: "missing",
        priority: "high",
        description: "No doc found",
      };

      const result = DocItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const invalid = {
        name: "fn",
        type: "jsdoc",
        file: "src/test.ts",
        status: "invalid",
        priority: "high",
        description: "No doc found",
      };

      const result = DocItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid priority", () => {
      const invalid = {
        name: "fn",
        type: "jsdoc",
        file: "src/test.ts",
        status: "missing",
        priority: "invalid",
        description: "No doc found",
      };

      const result = DocItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("JSDocEntrySchema", () => {
    it("should validate correct JSDoc entry", () => {
      const valid = {
        functionName: "test",
        file: "src/test.ts",
        line: 10,
        generatedDoc: "/** doc */",
        params: [],
        examples: [],
      };

      const result = JSDocEntrySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional originalDoc", () => {
      const valid = {
        functionName: "test",
        file: "src/test.ts",
        line: 10,
        originalDoc: "/** old */",
        generatedDoc: "/** new */",
        params: [],
        examples: [],
      };

      const result = JSDocEntrySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional returns", () => {
      const valid = {
        functionName: "test",
        file: "src/test.ts",
        line: 10,
        generatedDoc: "/** doc */",
        params: [],
        returns: { type: "string", description: "Result" },
        examples: [],
      };

      const result = JSDocEntrySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should validate params array", () => {
      const valid = {
        functionName: "test",
        file: "src/test.ts",
        line: 10,
        generatedDoc: "/** doc */",
        params: [{ name: "input", type: "string", description: "Input value" }],
        examples: [],
      };

      const result = JSDocEntrySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("ReadmeSectionSchema", () => {
    it("should validate correct README section", () => {
      const valid = {
        heading: "Installation",
        status: "complete",
        reason: "Section exists",
      };

      const result = ReadmeSectionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional currentContent", () => {
      const valid = {
        heading: "Installation",
        status: "outdated",
        currentContent: "Old content",
        reason: "Needs update",
      };

      const result = ReadmeSectionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional suggestedContent", () => {
      const valid = {
        heading: "Installation",
        status: "missing",
        suggestedContent: "New content",
        reason: "Add this section",
      };

      const result = ReadmeSectionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("DocAuditReportSchema", () => {
    it("should validate correct audit report", () => {
      const valid = {
        targetPath: "src/",
        generatedAt: "2024-01-15T10:00:00Z",
        totalItems: 10,
        documented: 8,
        missing: 1,
        outdated: 1,
        incomplete: 0,
        items: [],
        readmeSections: [],
        requiresHumanReview: false,
      };

      const result = DocAuditReportSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept optional humanReviewReason", () => {
      const valid = {
        targetPath: "src/",
        generatedAt: "2024-01-15T10:00:00Z",
        totalItems: 10,
        documented: 8,
        missing: 1,
        outdated: 1,
        incomplete: 0,
        items: [],
        readmeSections: [],
        requiresHumanReview: true,
        humanReviewReason: "Tutorial needed",
      };

      const result = DocAuditReportSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("DocReportSchema", () => {
    it("should validate correct doc report", () => {
      const valid = {
        targetPath: "src/test.ts",
        generatedAt: "2024-01-15T10:00:00Z",
        mode: "generate",
        filesProcessed: 1,
        jsDocEntries: [],
        readmeSections: [],
        gaps: [],
        suggestions: [],
        requiresHumanReview: false,
      };

      const result = DocReportSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should validate all modes", () => {
      const modes = ["generate", "audit", "smart"] as const;

      for (const mode of modes) {
        const valid = {
          targetPath: "src/",
          generatedAt: "2024-01-15T10:00:00Z",
          mode,
          filesProcessed: 1,
          jsDocEntries: [],
          readmeSections: [],
          gaps: [],
          suggestions: [],
          requiresHumanReview: false,
        };

        const result = DocReportSchema.safeParse(valid);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid mode", () => {
      const invalid = {
        targetPath: "src/",
        generatedAt: "2024-01-15T10:00:00Z",
        mode: "invalid",
        filesProcessed: 1,
        jsDocEntries: [],
        readmeSections: [],
        gaps: [],
        suggestions: [],
        requiresHumanReview: false,
      };

      const result = DocReportSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe("edge cases", () => {
  it("should handle empty doc report", () => {
    const report: DocReport = {
      targetPath: "src/",
      generatedAt: "2024-01-15T10:00:00Z",
      mode: "generate",
      filesProcessed: 0,
      jsDocEntries: [],
      readmeSections: [],
      gaps: [],
      suggestions: [],
      requiresHumanReview: false,
    };

    const result = formatDocReport(report);

    expect(result).toContain("# Documentation Report");
    expect(result).toContain("**JSDoc Entries:** 0");
    expect(result).not.toContain("## JSDoc Entries");
  });

  it("should handle empty audit report", () => {
    const report: DocAuditReport = {
      targetPath: "src/",
      generatedAt: "2024-01-15T10:00:00Z",
      totalItems: 0,
      documented: 0,
      missing: 0,
      outdated: 0,
      incomplete: 0,
      items: [],
      readmeSections: [],
      requiresHumanReview: false,
    };

    const result = formatAuditReport(report);

    expect(result).toContain("# Documentation Audit Report");
    expect(result).toContain("| Total Items | 0 |");
    expect(result).not.toContain("## ❌ Missing Documentation");
  });

  it("should handle fully populated doc report", () => {
    const report: DocReport = {
      targetPath: "src/complex/",
      generatedAt: "2024-01-15T10:00:00Z",
      mode: "audit",
      filesProcessed: 5,
      jsDocEntries: [
        {
          functionName: "mainFn",
          file: "src/main.ts",
          line: 10,
          originalDoc: "/** old */",
          generatedDoc: "/** new */",
          params: [{ name: "input", type: "string", description: "Input" }],
          returns: { type: "void", description: "Nothing" },
          examples: ["mainFn('test')"],
        },
      ],
      readmeSections: [
        { heading: "Usage", status: "outdated", reason: "API changed" },
      ],
      gaps: [
        {
          name: "helperFn",
          type: "jsdoc",
          file: "src/helpers.ts",
          line: 5,
          status: "missing",
          priority: "high",
          description: "No docs",
        },
      ],
      suggestions: ["Add more examples"],
      requiresHumanReview: true,
      humanReviewReason: "Complex business logic",
    };

    const result = formatDocReport(report);

    expect(result).toContain("# Documentation Report");
    expect(result).toContain("## JSDoc Entries");
    expect(result).toContain("📝");
    expect(result).toContain("## README Sections");
    expect(result).toContain("## Documentation Gaps");
    expect(result).toContain("## Suggestions");
    expect(result).toContain("Complex business logic");
  });
});
