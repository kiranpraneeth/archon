/**
 * Memory System — Archon
 *
 * Pluggable memory abstraction for storing and retrieving context.
 * Use this module to give agents persistent memory across sessions.
 *
 * @module memory
 *
 * @example
 * // Create a file-based memory provider
 * import { createMemoryProvider } from "./memory";
 *
 * const memory = createMemoryProvider({
 *   type: "file",
 *   path: ".claude/memory",
 * });
 *
 * // Save a memory
 * await memory.save({
 *   content: "User prefers conventional commits",
 *   tags: ["preference", "git"],
 * });
 *
 * // Search memories
 * const results = await memory.search("commits");
 */

export * from "./types.js";

export type {
  MemoryEntry,
  MemoryInput,
  MemoryMetadata,
  MemoryProvider,
  MemorySearchOptions,
  MemoryConfig,
  FileMemoryConfig,
  McpMemoryConfig,
  CustomMemoryConfig,
} from "./types.js";

import type {
  MemoryConfig,
  MemoryProvider,
  FileMemoryConfig,
} from "./types.js";

/**
 * Registry for custom memory provider factories.
 *
 * Use `registerMemoryProvider` to add custom provider types.
 * The factory function receives the config and returns a provider.
 */
const providerRegistry = new Map<
  string,
  (config: MemoryConfig) => MemoryProvider
>();

/**
 * Register a custom memory provider factory.
 *
 * Call this to add support for new provider types beyond
 * the built-in "file" and "mcp" providers.
 *
 * @param type - The provider type identifier (e.g., "redis", "postgres")
 * @param factory - Function that creates a provider from config
 *
 * @example
 * // Register a Redis provider
 * registerMemoryProvider("redis", (config) => {
 *   return new RedisMemoryProvider(config.connectionString);
 * });
 *
 * // Now you can use it
 * const memory = createMemoryProvider({
 *   type: "redis",
 *   connectionString: "redis://localhost:6379",
 * });
 */
export function registerMemoryProvider(
  type: string,
  factory: (config: MemoryConfig) => MemoryProvider,
): void {
  providerRegistry.set(type, factory);
}

/**
 * Create a memory provider from configuration.
 *
 * Factory function that instantiates the appropriate provider
 * based on the config type.
 *
 * **Built-in providers:**
 * - `file`: JSON file storage in specified directory
 * - `mcp`: MCP server backend (requires server to be running)
 * - `custom`: Pass your own MemoryProvider implementation
 *
 * @param config - Provider configuration
 * @returns A MemoryProvider instance
 * @throws {Error} If the provider type is not supported
 *
 * @example
 * // File provider (good for development)
 * const memory = createMemoryProvider({
 *   type: "file",
 *   path: ".claude/memory",
 * });
 *
 * @example
 * // Custom provider (bring your own implementation)
 * const memory = createMemoryProvider({
 *   type: "custom",
 *   provider: myCustomProvider,
 * });
 */
export function createMemoryProvider(config: MemoryConfig): MemoryProvider {
  // Handle custom providers directly
  if (config.type === "custom") {
    return config.provider;
  }

  // Check for registered custom providers
  const factory = providerRegistry.get(config.type);
  if (factory) {
    return factory(config);
  }

  // Built-in providers
  switch (config.type) {
    case "file":
      return createFileProvider(config);

    case "mcp":
      return createMcpProvider(config);

    default: {
      const exhaustiveCheck: never = config;
      throw new Error(
        `Unknown memory provider type: ${(exhaustiveCheck as MemoryConfig).type}`,
      );
    }
  }
}

/**
 * Create a file-based memory provider.
 *
 * Stores memories as a JSON file in the specified directory.
 * Simple but effective for development and single-machine use.
 *
 * @internal
 */
function createFileProvider(config: FileMemoryConfig): MemoryProvider {
  // Lazy-load fs to keep the module browser-compatible
  // (even though Archon is Node-only, this is good practice)

  const memories = new Map<string, import("./types.js").MemoryEntry>();
  const filePath = `${config.path}/memories.json`;
  let loaded = false;

  const ensureLoaded = async (): Promise<void> => {
    if (loaded) return;

    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Load existing memories
      const data = await fs.readFile(filePath, "utf-8");
      const entries = JSON.parse(data) as import("./types.js").MemoryEntry[];

      for (const entry of entries) {
        // Parse date strings back to Date objects
        memories.set(entry.id, {
          ...entry,
          timestamp: new Date(entry.timestamp),
        });
      }
    } catch (error) {
      // File doesn't exist yet, start fresh
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    loaded = true;
  };

  const persist = async (): Promise<void> => {
    const fs = await import("fs/promises");
    const entries = Array.from(memories.values());
    await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
  };

  const generateId = (): string => {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };

  return {
    name: "file",

    async save(input) {
      await ensureLoaded();

      const entry: import("./types.js").MemoryEntry = {
        id: generateId(),
        content: input.content,
        metadata: input.metadata,
        timestamp: new Date(),
        tags: input.tags,
      };

      memories.set(entry.id, entry);
      await persist();

      return entry;
    },

    async search(query, options = {}) {
      await ensureLoaded();

      const lowerQuery = query.toLowerCase();
      let results = Array.from(memories.values()).filter((entry) =>
        entry.content.toLowerCase().includes(lowerQuery),
      );

      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        results = results.filter((entry) =>
          options.tags!.every((tag) => entry.tags.includes(tag)),
        );
      }

      // Filter by date range
      if (options.since) {
        results = results.filter((entry) => entry.timestamp >= options.since!);
      }
      if (options.until) {
        results = results.filter((entry) => entry.timestamp <= options.until!);
      }

      // Sort by timestamp (newest first)
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply limit
      if (options.limit && options.limit > 0) {
        results = results.slice(0, options.limit);
      }

      return results;
    },

    async get(id) {
      await ensureLoaded();
      return memories.get(id) ?? null;
    },

    async list(options = {}) {
      await ensureLoaded();

      let results = Array.from(memories.values());

      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        results = results.filter((entry) =>
          options.tags!.every((tag) => entry.tags.includes(tag)),
        );
      }

      // Filter by date range
      if (options.since) {
        results = results.filter((entry) => entry.timestamp >= options.since!);
      }
      if (options.until) {
        results = results.filter((entry) => entry.timestamp <= options.until!);
      }

      // Sort by timestamp (newest first)
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply limit
      if (options.limit && options.limit > 0) {
        results = results.slice(0, options.limit);
      }

      return results;
    },

    async delete(id) {
      await ensureLoaded();

      if (!memories.has(id)) {
        throw new Error(`Memory not found: ${id}`);
      }

      memories.delete(id);
      await persist();
    },
  };
}

/**
 * Create an MCP server-based memory provider.
 *
 * Delegates to an MCP memory server. Requires the server
 * to be configured and running in your Claude Code setup.
 *
 * @internal
 */
function createMcpProvider(
  config: import("./types.js").McpMemoryConfig,
): MemoryProvider {
  // MCP provider is a stub — actual implementation would need
  // to communicate with the MCP server via the Claude Code runtime.
  // For now, we throw a helpful error explaining this limitation.

  return {
    name: `mcp:${config.serverName}`,

    async save(_input) {
      throw new Error(
        `MCP provider "${config.serverName}" requires Claude Code runtime. ` +
          "Use the file provider for standalone execution, or run within Claude Code.",
      );
    },

    async search(_query, _options) {
      throw new Error(
        `MCP provider "${config.serverName}" requires Claude Code runtime.`,
      );
    },

    async get(_id) {
      throw new Error(
        `MCP provider "${config.serverName}" requires Claude Code runtime.`,
      );
    },

    async list(_options) {
      throw new Error(
        `MCP provider "${config.serverName}" requires Claude Code runtime.`,
      );
    },

    async delete(_id) {
      throw new Error(
        `MCP provider "${config.serverName}" requires Claude Code runtime.`,
      );
    },
  };
}
