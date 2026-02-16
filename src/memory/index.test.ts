import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMemoryProvider, registerMemoryProvider } from "./index.js";
import type { MemoryProvider, MemoryEntry, MemoryInput } from "./types.js";
import fs from "fs/promises";
import path from "path";

const TEST_MEMORY_PATH = ".claude/memory-test";

describe("createMemoryProvider", () => {
  describe("with file provider", () => {
    let memory: MemoryProvider;
    const testPath = TEST_MEMORY_PATH;

    beforeEach(async () => {
      // Clean up test directory
      try {
        await fs.rm(testPath, { recursive: true });
      } catch {
        // Directory might not exist
      }

      memory = createMemoryProvider({
        type: "file",
        path: testPath,
      });
    });

    afterEach(async () => {
      // Clean up test directory
      try {
        await fs.rm(testPath, { recursive: true });
      } catch {
        // Directory might not exist
      }
    });

    describe("save", () => {
      it("should save a memory and return it with id and timestamp", async () => {
        const input: MemoryInput = {
          content: "Test memory content",
          tags: ["test"],
        };

        const result = await memory.save(input);

        expect(result.id).toBeDefined();
        expect(result.id).toMatch(/^mem_/);
        expect(result.content).toBe("Test memory content");
        expect(result.tags).toEqual(["test"]);
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it("should save memory with metadata", async () => {
        const input: MemoryInput = {
          content: "Memory with metadata",
          metadata: { source: "test", importance: "high" },
          tags: ["test", "metadata"],
        };

        const result = await memory.save(input);

        expect(result.metadata).toEqual({ source: "test", importance: "high" });
      });

      it("should persist memories to file", async () => {
        await memory.save({ content: "Persisted memory", tags: ["persist"] });

        const filePath = path.join(testPath, "memories.json");
        const data = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(data);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].content).toBe("Persisted memory");
      });
    });

    describe("get", () => {
      it("should retrieve a saved memory by id", async () => {
        const saved = await memory.save({
          content: "Retrievable memory",
          tags: ["get-test"],
        });

        const result = await memory.get(saved.id);

        expect(result).not.toBeNull();
        expect(result?.content).toBe("Retrievable memory");
      });

      it("should return null for non-existent id", async () => {
        const result = await memory.get("non_existent_id");

        expect(result).toBeNull();
      });
    });

    describe("search", () => {
      beforeEach(async () => {
        await memory.save({
          content: "First memory about cats",
          tags: ["animals"],
        });
        await memory.save({
          content: "Second memory about dogs",
          tags: ["animals"],
        });
        await memory.save({
          content: "Third memory about TypeScript",
          tags: ["code"],
        });
      });

      it("should find memories matching query", async () => {
        const results = await memory.search("memory");

        expect(results).toHaveLength(3);
      });

      it("should be case-insensitive", async () => {
        const results = await memory.search("CATS");

        expect(results).toHaveLength(1);
        expect(results[0].content).toContain("cats");
      });

      it("should filter by tags", async () => {
        const results = await memory.search("memory", { tags: ["animals"] });

        expect(results).toHaveLength(2);
      });

      it("should respect limit", async () => {
        const results = await memory.search("memory", { limit: 2 });

        expect(results).toHaveLength(2);
      });

      it("should return empty array when no matches", async () => {
        const results = await memory.search("nonexistent");

        expect(results).toHaveLength(0);
      });
    });

    describe("list", () => {
      beforeEach(async () => {
        await memory.save({ content: "Memory A", tags: ["alpha"] });
        await memory.save({ content: "Memory B", tags: ["beta"] });
        await memory.save({ content: "Memory C", tags: ["alpha", "beta"] });
      });

      it("should list all memories", async () => {
        const results = await memory.list();

        expect(results).toHaveLength(3);
      });

      it("should filter by tags", async () => {
        const results = await memory.list({ tags: ["alpha"] });

        expect(results).toHaveLength(2);
      });

      it("should filter by multiple tags (AND)", async () => {
        const results = await memory.list({ tags: ["alpha", "beta"] });

        expect(results).toHaveLength(1);
        expect(results[0].content).toBe("Memory C");
      });

      it("should respect limit", async () => {
        const results = await memory.list({ limit: 1 });

        expect(results).toHaveLength(1);
      });

      it("should sort by timestamp (newest first)", async () => {
        const results = await memory.list();

        // Verify timestamps are in descending order
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
            results[i].timestamp.getTime(),
          );
        }
      });
    });

    describe("delete", () => {
      it("should delete a memory by id", async () => {
        const saved = await memory.save({
          content: "To be deleted",
          tags: ["delete-test"],
        });

        await memory.delete(saved.id);

        const result = await memory.get(saved.id);
        expect(result).toBeNull();
      });

      it("should throw for non-existent id", async () => {
        await expect(memory.delete("non_existent_id")).rejects.toThrow(
          "Memory not found",
        );
      });

      it("should persist deletion", async () => {
        const saved = await memory.save({
          content: "Delete and persist",
          tags: ["delete-test"],
        });

        await memory.delete(saved.id);

        // Create new provider instance to verify persistence
        const newMemory = createMemoryProvider({
          type: "file",
          path: testPath,
        });
        const result = await newMemory.get(saved.id);

        expect(result).toBeNull();
      });
    });

    describe("persistence", () => {
      it("should load memories from existing file", async () => {
        await memory.save({ content: "Persistent memory", tags: ["persist"] });

        // Create new provider instance
        const newMemory = createMemoryProvider({
          type: "file",
          path: testPath,
        });
        const results = await newMemory.list();

        expect(results).toHaveLength(1);
        expect(results[0].content).toBe("Persistent memory");
      });

      it("should preserve timestamps across loads", async () => {
        const saved = await memory.save({
          content: "Timestamped memory",
          tags: ["time"],
        });

        const newMemory = createMemoryProvider({
          type: "file",
          path: testPath,
        });
        const loaded = await newMemory.get(saved.id);

        expect(loaded?.timestamp).toBeInstanceOf(Date);
        expect(loaded?.timestamp.getTime()).toBe(saved.timestamp.getTime());
      });
    });
  });

  describe("with custom provider", () => {
    it("should use the provided custom provider", async () => {
      const mockEntries: MemoryEntry[] = [];

      const customProvider: MemoryProvider = {
        name: "mock",
        async save(input) {
          const entry: MemoryEntry = {
            id: "custom_123",
            content: input.content,
            metadata: input.metadata,
            timestamp: new Date(),
            tags: input.tags,
          };
          mockEntries.push(entry);
          return entry;
        },
        async search() {
          return mockEntries;
        },
        async get(id) {
          return mockEntries.find((e) => e.id === id) ?? null;
        },
        async list() {
          return mockEntries;
        },
        async delete(id) {
          const index = mockEntries.findIndex((e) => e.id === id);
          if (index >= 0) mockEntries.splice(index, 1);
        },
      };

      const memory = createMemoryProvider({
        type: "custom",
        provider: customProvider,
      });

      const saved = await memory.save({ content: "Custom content", tags: [] });

      expect(saved.id).toBe("custom_123");
      expect(memory.name).toBe("mock");
    });
  });

  describe("with mcp provider", () => {
    it("should throw helpful error for MCP provider outside Claude Code", async () => {
      const memory = createMemoryProvider({
        type: "mcp",
        serverName: "memory",
      });

      await expect(memory.save({ content: "test", tags: [] })).rejects.toThrow(
        "requires Claude Code runtime",
      );
    });
  });

  describe("registerMemoryProvider", () => {
    it("should allow registering custom provider factories", async () => {
      const mockProvider: MemoryProvider = {
        name: "registered",
        async save(input) {
          return {
            id: "reg_123",
            content: input.content,
            metadata: input.metadata,
            timestamp: new Date(),
            tags: input.tags,
          };
        },
        async search() {
          return [];
        },
        async get() {
          return null;
        },
        async list() {
          return [];
        },
        async delete() {},
      };

      registerMemoryProvider("my-custom-type", () => mockProvider);

      const memory = createMemoryProvider({
        type: "my-custom-type" as "file", // Type assertion for test
      } as { type: "file"; path: string });

      expect(memory.name).toBe("registered");
    });
  });
});
