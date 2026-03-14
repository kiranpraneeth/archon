/**
 * Spec Parser — Archon Planning Agent
 *
 * Parses TypeSpec and OpenAPI specifications into structured data
 * that can be used for planning and code generation.
 */

import { z } from "zod";

/**
 * Supported input formats for specifications
 */
export const SpecFormat = {
  TYPESPEC: "typespec",
  OPENAPI: "openapi",
  PRD: "prd",
  UNKNOWN: "unknown",
} as const;

export type SpecFormat = (typeof SpecFormat)[keyof typeof SpecFormat];

/**
 * HTTP methods for API operations
 */
export const HttpMethod = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

/**
 * Schema for a single API parameter
 */
export const ApiParameterSchema = z.object({
  name: z.string(),
  in: z.enum(["path", "query", "header", "body"]),
  type: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
});

export type ApiParameter = z.infer<typeof ApiParameterSchema>;

/**
 * Schema for an API response
 */
export const ApiResponseSchema = z.object({
  statusCode: z.number(),
  description: z.string().optional(),
  schema: z.string().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

/**
 * Schema for an API operation/endpoint
 */
export const ApiOperationSchema = z.object({
  operationId: z.string(),
  method: z.enum(["get", "post", "put", "patch", "delete"]),
  path: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  parameters: z.array(ApiParameterSchema),
  requestBody: z.string().optional(),
  responses: z.array(ApiResponseSchema),
  tags: z.array(z.string()),
});

export type ApiOperation = z.infer<typeof ApiOperationSchema>;

/**
 * Schema for a model/type definition
 */
export const ModelDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean(),
      description: z.string().optional(),
    }),
  ),
  isEnum: z.boolean(),
  enumValues: z.array(z.string()).optional(),
});

export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;

/**
 * Schema for the parsed specification result
 */
export const ParsedSpecSchema = z.object({
  format: z.enum(["typespec", "openapi", "prd", "unknown"]),
  title: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  servers: z.array(
    z.object({
      url: z.string(),
      description: z.string().optional(),
    }),
  ),
  operations: z.array(ApiOperationSchema),
  models: z.array(ModelDefinitionSchema),
  namespaces: z.array(z.string()),
  imports: z.array(z.string()),
  rawContent: z.string(),
});

export type ParsedSpec = z.infer<typeof ParsedSpecSchema>;

/**
 * Detect the format of a specification file
 *
 * @param content - Raw content of the specification file
 * @param filename - Optional filename for extension-based detection
 * @returns Detected specification format
 */
export function detectSpecFormat(
  content: string,
  filename?: string,
): SpecFormat {
  // Extension-based detection
  if (filename) {
    if (filename.endsWith(".tsp")) return SpecFormat.TYPESPEC;
    if (filename.endsWith(".yaml") || filename.endsWith(".yml")) {
      // Could be OpenAPI or TypeSpec config
      if (content.includes("openapi:") || content.includes("swagger:")) {
        return SpecFormat.OPENAPI;
      }
    }
    if (filename.endsWith(".json")) {
      if (content.includes('"openapi"') || content.includes('"swagger"')) {
        return SpecFormat.OPENAPI;
      }
    }
    if (filename.endsWith(".md")) {
      return SpecFormat.PRD;
    }
  }

  // Content-based detection
  const trimmed = content.trim();

  // TypeSpec indicators
  if (
    trimmed.includes('import "@typespec/') ||
    trimmed.includes("using TypeSpec.") ||
    trimmed.includes("@service(") ||
    (trimmed.includes("namespace ") && trimmed.includes("model "))
  ) {
    return SpecFormat.TYPESPEC;
  }

  // OpenAPI indicators (YAML or JSON)
  if (
    trimmed.includes("openapi:") ||
    trimmed.includes('"openapi"') ||
    trimmed.includes("swagger:") ||
    trimmed.includes('"swagger"')
  ) {
    return SpecFormat.OPENAPI;
  }

  // PRD indicators (markdown with requirements)
  if (
    trimmed.startsWith("#") &&
    (trimmed.includes("## Requirements") ||
      trimmed.includes("## User Stories") ||
      trimmed.includes("## Features") ||
      trimmed.includes("## Acceptance Criteria") ||
      trimmed.includes("FR-") ||
      trimmed.includes("NFR-"))
  ) {
    return SpecFormat.PRD;
  }

  return SpecFormat.UNKNOWN;
}

/**
 * Parse TypeSpec content into structured data
 *
 * @param content - TypeSpec file content
 * @returns Parsed specification data
 */
export function parseTypeSpec(content: string): ParsedSpec {
  const lines = content.split("\n");
  const imports: string[] = [];
  const namespaces: string[] = [];
  const servers: Array<{ url: string; description?: string }> = [];
  const models: ModelDefinition[] = [];
  const operations: ApiOperation[] = [];
  let title = "";
  let description = "";

  let currentModel: Partial<ModelDefinition> | null = null;
  let currentModelProperties: ModelDefinition["properties"] = [];
  let braceDepth = 0;
  let inModel = false;
  let inEnum = false;
  let enumValues: string[] = [];
  let currentNamespace = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";

    // Parse imports
    if (line.startsWith("import ")) {
      const match = line.match(/import\s+"([^"]+)"/);
      if (match?.[1]) {
        imports.push(match[1]);
      }
      continue;
    }

    // Parse @service decorator for title (may span multiple lines)
    if (line.startsWith("@service(") || line.includes("title:")) {
      const titleMatch = line.match(/title:\s*"([^"]+)"/);
      if (titleMatch?.[1]) {
        title = titleMatch[1];
      }
      // Don't continue here - @service may have other content on same line
    }

    // Parse @server decorator
    if (line.startsWith("@server(")) {
      const serverMatch = line.match(/@server\("([^"]+)"(?:,\s*"([^"]+)")?\)/);
      if (serverMatch?.[1]) {
        servers.push({
          url: serverMatch[1],
          description: serverMatch[2],
        });
      }
      continue;
    }

    // Parse namespace
    if (line.startsWith("namespace ")) {
      const nsMatch = line.match(/namespace\s+(\w+)/);
      if (nsMatch?.[1]) {
        currentNamespace = nsMatch[1];
        if (!namespaces.includes(nsMatch[1])) {
          namespaces.push(nsMatch[1]);
        }
      }
      continue;
    }

    // Parse enum
    if (line.startsWith("enum ")) {
      const enumMatch = line.match(/enum\s+(\w+)/);
      if (enumMatch?.[1]) {
        inEnum = true;
        enumValues = [];
        currentModel = {
          name: enumMatch[1],
          isEnum: true,
          properties: [],
        };
      }
      continue;
    }

    // Parse enum values
    if (inEnum) {
      if (line.includes("}")) {
        if (currentModel?.name) {
          models.push({
            name: currentModel.name,
            description: currentModel.description,
            properties: [],
            isEnum: true,
            enumValues,
          });
        }
        inEnum = false;
        currentModel = null;
        enumValues = [];
        continue;
      }

      // Extract enum value (handle comments)
      const enumValueMatch = line.match(/^(\w+),?/);
      if (enumValueMatch?.[1]) {
        enumValues.push(enumValueMatch[1]);
      }
      continue;
    }

    // Parse model
    if (line.startsWith("model ")) {
      const modelMatch = line.match(/model\s+(\w+)/);
      if (modelMatch?.[1]) {
        inModel = true;
        braceDepth = 0;
        currentModelProperties = [];
        currentModel = {
          name: modelMatch[1],
          isEnum: false,
        };
        // Count braces on the model declaration line
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;

        // Check if model is empty (single line like "model User {}")
        if (braceDepth === 0 && line.includes("{") && line.includes("}")) {
          const modelName = currentModel.name;
          if (modelName) {
            models.push({
              name: modelName,
              description: currentModel.description,
              properties: currentModelProperties,
              isEnum: false,
            });
          }
          inModel = false;
          currentModel = null;
          currentModelProperties = [];
        }
      }
      continue;
    }

    // Track brace depth for models
    if (inModel) {
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Parse property
      const propMatch = line.match(/^(\w+)(\?)?:\s*(.+?);?$/);
      if (propMatch?.[1] && propMatch[3]) {
        currentModelProperties.push({
          name: propMatch[1],
          type: propMatch[3].replace(/;$/, "").trim(),
          required: propMatch[2] !== "?",
          description: undefined,
        });
      }

      // Check for comment on previous line for description
      if (i > 0) {
        const prevLine = lines[i - 1]?.trim() ?? "";
        if (prevLine.startsWith("/**") || prevLine.startsWith("*")) {
          const descMatch = prevLine.match(/\*\s*(.+)/);
          if (descMatch?.[1] && currentModelProperties.length > 0) {
            const lastProp =
              currentModelProperties[currentModelProperties.length - 1];
            if (lastProp) {
              lastProp.description = descMatch[1].trim();
            }
          }
        }
      }

      // Model ends
      if (braceDepth === 0 && line.includes("}")) {
        if (currentModel?.name) {
          models.push({
            name: currentModel.name,
            description: currentModel.description,
            properties: currentModelProperties,
            isEnum: false,
          });
        }
        inModel = false;
        currentModel = null;
        currentModelProperties = [];
      }
      continue;
    }

    // Parse operations (routes)
    if (line.startsWith("@route(")) {
      const routeMatch = line.match(/@route\("([^"]+)"\)/);
      if (routeMatch?.[1]) {
        const path = routeMatch[1];
        // Look ahead for operation
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const opLine = lines[j]?.trim() ?? "";
          const opMatch = opLine.match(/^op\s+(\w+)\(/);
          if (opMatch?.[1]) {
            // Determine HTTP method from decorator above op
            let method: HttpMethod = HttpMethod.GET;
            for (let k = i; k < j; k++) {
              const methodLine = lines[k]?.trim() ?? "";
              if (methodLine.startsWith("@get")) method = HttpMethod.GET;
              else if (methodLine.startsWith("@post")) method = HttpMethod.POST;
              else if (methodLine.startsWith("@put")) method = HttpMethod.PUT;
              else if (methodLine.startsWith("@patch"))
                method = HttpMethod.PATCH;
              else if (methodLine.startsWith("@delete"))
                method = HttpMethod.DELETE;
            }

            operations.push({
              operationId: opMatch[1],
              method,
              path,
              parameters: [],
              responses: [{ statusCode: 200 }],
              tags: currentNamespace ? [currentNamespace] : [],
            });
            break;
          }
        }
      }
    }

    // Parse description from doc comments
    if (line.startsWith("/**") && !title && !description) {
      const descLines: string[] = [];
      for (let j = i; j < lines.length; j++) {
        const docLine = lines[j]?.trim() ?? "";
        if (docLine.includes("*/")) break;
        const textMatch = docLine.match(/\*\s*(.+)/);
        if (textMatch?.[1]) {
          descLines.push(textMatch[1]);
        }
      }
      if (descLines.length > 0) {
        description = descLines.join(" ");
      }
    }
  }

  return {
    format: SpecFormat.TYPESPEC,
    title: title || "Untitled API",
    description,
    servers,
    operations,
    models,
    namespaces,
    imports,
    rawContent: content,
  };
}

/**
 * Parse OpenAPI specification (YAML or JSON)
 *
 * This is a simplified parser that extracts key information.
 * For full parsing, consider using a library like swagger-parser.
 *
 * @param content - OpenAPI spec content (YAML or JSON)
 * @returns Parsed specification data
 */
export function parseOpenApi(content: string): ParsedSpec {
  const isJson = content.trim().startsWith("{");

  let title = "Untitled API";
  let version: string | undefined;
  let description: string | undefined;
  const servers: Array<{ url: string; description?: string }> = [];
  const operations: ApiOperation[] = [];
  const models: ModelDefinition[] = [];

  if (isJson) {
    try {
      const spec = JSON.parse(content) as {
        info?: { title?: string; version?: string; description?: string };
        servers?: Array<{ url: string; description?: string }>;
        paths?: Record<string, Record<string, unknown>>;
        components?: { schemas?: Record<string, unknown> };
        definitions?: Record<string, unknown>;
      };
      title = spec.info?.title || title;
      version = spec.info?.version;
      description = spec.info?.description;

      // Parse servers
      if (spec.servers) {
        for (const server of spec.servers) {
          servers.push({
            url: server.url,
            description: server.description,
          });
        }
      }

      // Parse paths/operations
      if (spec.paths) {
        for (const [path, methods] of Object.entries(spec.paths)) {
          for (const [method, op] of Object.entries(methods)) {
            if (["get", "post", "put", "patch", "delete"].includes(method)) {
              const operation = op as {
                operationId?: string;
                summary?: string;
                description?: string;
                tags?: string[];
                parameters?: Array<{
                  name: string;
                  in: string;
                  required?: boolean;
                  schema?: { type?: string };
                }>;
                responses?: Record<string, { description?: string }>;
              };
              operations.push({
                operationId:
                  operation.operationId ||
                  `${method}_${path.replace(/\//g, "_")}`,
                method: method as HttpMethod,
                path,
                summary: operation.summary,
                description: operation.description,
                parameters:
                  operation.parameters?.map((p) => ({
                    name: p.name,
                    in: p.in as "path" | "query" | "header" | "body",
                    type: p.schema?.type || "string",
                    required: p.required || false,
                  })) || [],
                responses: Object.entries(operation.responses || {}).map(
                  ([code, resp]) => ({
                    statusCode: parseInt(code, 10),
                    description: resp.description,
                  }),
                ),
                tags: operation.tags || [],
              });
            }
          }
        }
      }

      // Parse schemas/models
      const schemas = spec.components?.schemas || spec.definitions;
      if (schemas) {
        for (const [name, schema] of Object.entries(schemas)) {
          const s = schema as {
            description?: string;
            enum?: string[];
            properties?: Record<
              string,
              { type?: string; description?: string }
            >;
            required?: string[];
          };
          const isEnum = !!s.enum;
          models.push({
            name,
            description: s.description,
            isEnum,
            enumValues: s.enum,
            properties: isEnum
              ? []
              : Object.entries(s.properties || {}).map(([propName, prop]) => ({
                  name: propName,
                  type: prop.type || "any",
                  required: s.required?.includes(propName) || false,
                  description: prop.description,
                })),
          });
        }
      }
    } catch {
      // JSON parse failed, return minimal result
    }
  } else {
    // YAML parsing - simplified extraction
    const titleMatch = content.match(/title:\s*['"]?([^'"\n]+)/);
    if (titleMatch?.[1]) title = titleMatch[1].trim();

    const versionMatch = content.match(/version:\s*['"]?([^'"\n]+)/);
    if (versionMatch?.[1]) version = versionMatch[1].trim();

    const descMatch = content.match(/description:\s*['"]?([^'"\n]+)/);
    if (descMatch?.[1]) description = descMatch[1].trim();

    // Extract servers
    const serverMatches = content.matchAll(/-\s*url:\s*['"]?([^'"\n]+)/g);
    for (const match of serverMatches) {
      if (match[1]) {
        servers.push({ url: match[1].trim() });
      }
    }
  }

  return {
    format: SpecFormat.OPENAPI,
    title,
    version,
    description,
    servers,
    operations,
    models,
    namespaces: [],
    imports: [],
    rawContent: content,
  };
}

/**
 * Parse any specification format
 *
 * @param content - Specification content
 * @param filename - Optional filename for format detection
 * @returns Parsed specification data
 */
export function parseSpec(content: string, filename?: string): ParsedSpec {
  const format = detectSpecFormat(content, filename);

  switch (format) {
    case SpecFormat.TYPESPEC:
      return parseTypeSpec(content);
    case SpecFormat.OPENAPI:
      return parseOpenApi(content);
    case SpecFormat.PRD:
      // PRD is not an API spec, return minimal result
      return {
        format: SpecFormat.PRD,
        title: "PRD Document",
        servers: [],
        operations: [],
        models: [],
        namespaces: [],
        imports: [],
        rawContent: content,
      };
    default:
      return {
        format: SpecFormat.UNKNOWN,
        title: "Unknown Format",
        servers: [],
        operations: [],
        models: [],
        namespaces: [],
        imports: [],
        rawContent: content,
      };
  }
}
