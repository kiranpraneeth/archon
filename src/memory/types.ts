/**
 * Memory System — Archon
 *
 * A pluggable memory abstraction for storing and retrieving context.
 * Designed for extensibility — add your own providers (Redis, Postgres,
 * vector stores, MCP servers, etc.) by implementing the MemoryProvider interface.
 *
 * @module memory/types
 */

import { z } from "zod";

/**
 * Metadata attached to a memory entry.
 *
 * Use metadata to store structured information about the memory:
 * - `source`: Where this memory came from (e.g., "conversation", "code-review")
 * - `agent`: Which agent created it (e.g., "reviewer", "documenter")
 * - Custom fields specific to your use case
 *
 * @example
 * const metadata: MemoryMetadata = {
 *   source: "code-review",
 *   agent: "reviewer",
 *   prNumber: 42,
 * };
 */
export type MemoryMetadata = Record<string, unknown>;

/**
 * Schema for validating memory entries at runtime.
 *
 * Use this when receiving memory entries from external sources
 * (APIs, user input, etc.) to ensure they match the expected shape.
 */
export const MemoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  tags: z.array(z.string()),
});

/**
 * A single memory entry stored in the system.
 *
 * Memory entries are the atomic unit of storage. Each entry has:
 * - A unique ID for retrieval and deletion
 * - Content (the actual information to remember)
 * - Optional metadata for structured attributes
 * - A timestamp for ordering and expiration
 * - Tags for categorization and filtering
 *
 * @property id - Unique identifier. Use UUIDs or provider-specific IDs.
 * @property content - The memory content. Can be plain text, JSON string, etc.
 * @property metadata - Structured data about the memory. Optional but recommended.
 * @property timestamp - When this memory was created or last updated.
 * @property tags - Categories for filtering. Examples: ["architecture", "decision"]
 *
 * @example
 * const entry: MemoryEntry = {
 *   id: "mem_abc123",
 *   content: "User prefers conventional commits with scope",
 *   metadata: { source: "conversation", confidence: 0.95 },
 *   timestamp: new Date(),
 *   tags: ["preference", "git"],
 * };
 */
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

/**
 * Input for creating a new memory entry.
 *
 * Omits `id` and `timestamp` since these are typically generated
 * by the provider. Use this type for the `save` method input.
 *
 * @example
 * const input: MemoryInput = {
 *   content: "The auth module uses JWT tokens with 1-hour expiry",
 *   metadata: { source: "code-analysis", file: "src/auth/jwt.ts" },
 *   tags: ["auth", "architecture"],
 * };
 */
export type MemoryInput = Omit<MemoryEntry, "id" | "timestamp">;

/**
 * Search options for querying memories.
 *
 * @property limit - Maximum results to return. Default varies by provider.
 * @property tags - Filter results to entries with ALL specified tags.
 * @property since - Only return entries created after this date.
 * @property until - Only return entries created before this date.
 */
export type MemorySearchOptions = {
  limit?: number;
  tags?: string[];
  since?: Date;
  until?: Date;
};

/**
 * Provider-agnostic interface for memory operations.
 *
 * Implement this interface to create a new memory provider.
 * All methods are async to support both local and remote backends.
 *
 * **Built-in providers:**
 * - `file`: JSON file storage (good for development)
 * - `mcp`: MCP server backend (for Claude Code integration)
 *
 * **Custom providers:** Implement this interface for Redis, Postgres,
 * Pinecone, or any other storage backend.
 *
 * @example
 * // Using a provider
 * const memory = createMemoryProvider({ type: "file", path: ".claude/memory" });
 * await memory.save({ content: "Remember this", tags: ["important"] });
 * const results = await memory.search("remember");
 *
 * @example
 * // Implementing a custom provider
 * class RedisMemoryProvider implements MemoryProvider {
 *   async save(input: MemoryInput): Promise<MemoryEntry> {
 *     const entry = { ...input, id: generateId(), timestamp: new Date() };
 *     await this.redis.set(`memory:${entry.id}`, JSON.stringify(entry));
 *     return entry;
 *   }
 *   // ... implement other methods
 * }
 */
export type MemoryProvider = {
  /**
   * Save a new memory entry.
   *
   * The provider generates the `id` and `timestamp` fields.
   * Returns the complete entry with all fields populated.
   *
   * @param input - The memory content, metadata, and tags
   * @returns The saved entry with generated id and timestamp
   *
   * @example
   * const entry = await memory.save({
   *   content: "User prefers TypeScript strict mode",
   *   tags: ["preference", "typescript"],
   * });
   * console.log(entry.id); // "mem_xyz789"
   */
  save(input: MemoryInput): Promise<MemoryEntry>;

  /**
   * Search for memories matching a query.
   *
   * Search behavior depends on the provider:
   * - File provider: substring match on content
   * - Vector providers: semantic similarity search
   * - MCP providers: depends on server implementation
   *
   * @param query - Search query string
   * @param options - Search options (limit, tags, date range)
   * @returns Matching entries, sorted by relevance (provider-dependent)
   *
   * @example
   * // Basic search
   * const results = await memory.search("authentication");
   *
   * // With options
   * const recent = await memory.search("auth", {
   *   limit: 5,
   *   tags: ["security"],
   *   since: new Date("2024-01-01"),
   * });
   */
  search(query: string, options?: MemorySearchOptions): Promise<MemoryEntry[]>;

  /**
   * Get a specific memory by ID.
   *
   * @param id - The memory entry ID
   * @returns The entry if found, null otherwise
   *
   * @example
   * const entry = await memory.get("mem_abc123");
   * if (entry) {
   *   console.log(entry.content);
   * }
   */
  get(id: string): Promise<MemoryEntry | null>;

  /**
   * List memories, optionally filtered by tags.
   *
   * Unlike `search`, this doesn't query content — it returns
   * all entries matching the tag filter (or all entries if no filter).
   *
   * @param options - Filter and pagination options
   * @returns Matching entries, sorted by timestamp (newest first)
   *
   * @example
   * // List all memories
   * const all = await memory.list();
   *
   * // List by tags
   * const decisions = await memory.list({ tags: ["decision"] });
   *
   * // With limit
   * const recent = await memory.list({ limit: 10 });
   */
  list(options?: MemorySearchOptions): Promise<MemoryEntry[]>;

  /**
   * Delete a memory by ID.
   *
   * @param id - The memory entry ID to delete
   * @throws May throw if the entry doesn't exist (provider-dependent)
   *
   * @example
   * await memory.delete("mem_abc123");
   */
  delete(id: string): Promise<void>;

  /**
   * Provider name for debugging and logging.
   *
   * @example
   * console.log(`Using ${memory.name} provider`);
   * // "Using file provider"
   */
  readonly name: string;
};

/**
 * Configuration for the file-based memory provider.
 *
 * Stores memories as JSON files in the specified directory.
 * Good for development and single-machine deployments.
 *
 * @property type - Must be "file"
 * @property path - Directory to store memory files. Created if missing.
 */
export type FileMemoryConfig = {
  type: "file";
  path: string;
};

/**
 * Configuration for MCP server-based memory provider.
 *
 * Delegates to an MCP memory server (like @modelcontextprotocol/server-memory).
 * Good for Claude Code integration.
 *
 * @property type - Must be "mcp"
 * @property serverName - Name of the MCP server in your config
 */
export type McpMemoryConfig = {
  type: "mcp";
  serverName: string;
};

/**
 * Configuration for custom memory providers.
 *
 * Use this when implementing your own provider.
 * The `options` field is provider-specific.
 *
 * @property type - Must be "custom"
 * @property provider - Your MemoryProvider implementation
 */
export type CustomMemoryConfig = {
  type: "custom";
  provider: MemoryProvider;
};

/**
 * Union of all supported memory configurations.
 *
 * Pass to `createMemoryProvider()` to instantiate a provider.
 *
 * @example
 * // File provider
 * const config: MemoryConfig = { type: "file", path: ".claude/memory" };
 *
 * // MCP provider
 * const config: MemoryConfig = { type: "mcp", serverName: "memory" };
 *
 * // Custom provider
 * const config: MemoryConfig = { type: "custom", provider: myProvider };
 */
export type MemoryConfig =
  | FileMemoryConfig
  | McpMemoryConfig
  | CustomMemoryConfig;
