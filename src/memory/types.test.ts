import { describe, it, expect } from "vitest";

import { MemoryEntrySchema } from "./types.js";

describe("MemoryEntrySchema", () => {
  describe("when validating valid input", () => {
    it("should accept minimal valid entry", () => {
      const input = {
        id: "mem_123",
        content: "Test memory",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept entry with all fields", () => {
      const input = {
        id: "mem_456",
        content: "Full memory entry",
        metadata: { source: "test", priority: 1 },
        timestamp: new Date("2024-01-15"),
        tags: ["test", "example"],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({ source: "test", priority: 1 });
        expect(result.data.tags).toHaveLength(2);
      }
    });

    it("should accept empty tags array", () => {
      const input = {
        id: "mem_789",
        content: "No tags",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept metadata with various value types", () => {
      const input = {
        id: "mem_meta",
        content: "Complex metadata",
        metadata: {
          string: "value",
          number: 42,
          boolean: true,
          nested: { key: "value" },
          array: [1, 2, 3],
        },
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe("when validating invalid input", () => {
    it("should reject missing id", () => {
      const input = {
        content: "No ID",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing content", () => {
      const input = {
        id: "mem_123",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing timestamp", () => {
      const input = {
        id: "mem_123",
        content: "No timestamp",
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing tags", () => {
      const input = {
        id: "mem_123",
        content: "No tags field",
        timestamp: new Date(),
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject non-string id", () => {
      const input = {
        id: 123,
        content: "Numeric ID",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject non-array tags", () => {
      const input = {
        id: "mem_123",
        content: "String tags",
        timestamp: new Date(),
        tags: "not-an-array",
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject non-string tags in array", () => {
      const input = {
        id: "mem_123",
        content: "Numeric tags",
        timestamp: new Date(),
        tags: [1, 2, 3],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid timestamp", () => {
      const input = {
        id: "mem_123",
        content: "String timestamp",
        timestamp: "not-a-date",
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept empty string content", () => {
      const input = {
        id: "mem_empty",
        content: "",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept empty string id", () => {
      const input = {
        id: "",
        content: "Empty ID",
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should handle undefined metadata (optional field)", () => {
      const input = {
        id: "mem_123",
        content: "No metadata",
        metadata: undefined,
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should handle empty metadata object", () => {
      const input = {
        id: "mem_123",
        content: "Empty metadata",
        metadata: {},
        timestamp: new Date(),
        tags: [],
      };

      const result = MemoryEntrySchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});
