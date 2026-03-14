/**
 * Spec Generator — Archon Planning Agent
 *
 * Generates TypeSpec specifications from requirements or technical specifications.
 * This enables spec-driven development where the API contract is defined first.
 */

import { z } from "zod";
import type { TechnicalSpec, TechnicalTask } from "./index.js";

/**
 * Configuration for TypeSpec generation
 */
export type TypeSpecGeneratorConfig = {
  /** Namespace for the generated spec */
  namespace: string;
  /** Service title */
  serviceTitle: string;
  /** Service version */
  version: string;
  /** Development server URL */
  devServer?: string;
  /** Production server URL */
  prodServer?: string;
  /** Include JSDoc comments */
  includeComments: boolean;
  /** Include example decorators */
  includeExamples: boolean;
};

const DEFAULT_CONFIG: TypeSpecGeneratorConfig = {
  namespace: "Api",
  serviceTitle: "Generated API",
  version: "1.0.0",
  devServer: "http://localhost:3000",
  includeComments: true,
  includeExamples: false,
};

/**
 * Schema for API endpoint definition (input for generator)
 */
export const EndpointDefinitionSchema = z.object({
  name: z.string(),
  method: z.enum(["get", "post", "put", "patch", "delete"]),
  path: z.string(),
  description: z.string().optional(),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        in: z.enum(["path", "query", "header", "body"]),
        required: z.boolean(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  requestBody: z
    .object({
      type: z.string(),
      description: z.string().optional(),
    })
    .optional(),
  responses: z
    .array(
      z.object({
        statusCode: z.number(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

export type EndpointDefinition = z.infer<typeof EndpointDefinitionSchema>;

/**
 * Schema for model/type definition (input for generator)
 */
export const TypeDefinitionSchema = z.object({
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
  isEnum: z.boolean().optional(),
  enumValues: z.array(z.string()).optional(),
});

export type TypeDefinition = z.infer<typeof TypeDefinitionSchema>;

/**
 * Schema for a complete API specification (input for generator)
 */
export const ApiSpecificationSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  namespace: z.string().optional(),
  types: z.array(TypeDefinitionSchema),
  endpoints: z.array(EndpointDefinitionSchema),
});

export type ApiSpecification = z.infer<typeof ApiSpecificationSchema>;

/**
 * Convert a TypeScript/simple type to TypeSpec type
 */
function toTypeSpecType(type: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "int32",
    integer: "int32",
    boolean: "boolean",
    "string[]": "string[]",
    "number[]": "int32[]",
    object: "Record<unknown>",
    any: "unknown",
    void: "void",
    null: "null",
  };

  // Check for array types
  if (type.endsWith("[]")) {
    const baseType = type.slice(0, -2);
    const mappedBase = typeMap[baseType] || baseType;
    return `${mappedBase}[]`;
  }

  // Check for optional types
  if (type.endsWith("?")) {
    const baseType = type.slice(0, -1);
    const mappedBase = typeMap[baseType] || baseType;
    return `${mappedBase}?`;
  }

  return typeMap[type] || type;
}

/**
 * Generate TypeSpec enum definition
 */
function generateEnum(type: TypeDefinition, includeComments: boolean): string {
  const lines: string[] = [];

  if (includeComments && type.description) {
    lines.push("/**");
    lines.push(` * ${type.description}`);
    lines.push(" */");
  }

  lines.push(`enum ${type.name} {`);

  for (const value of type.enumValues || []) {
    lines.push(`  ${value},`);
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate TypeSpec model definition
 */
function generateModel(type: TypeDefinition, includeComments: boolean): string {
  const lines: string[] = [];

  if (includeComments && type.description) {
    lines.push("/**");
    lines.push(` * ${type.description}`);
    lines.push(" */");
  }

  lines.push(`model ${type.name} {`);

  for (const prop of type.properties) {
    if (includeComments && prop.description) {
      lines.push(`  /** ${prop.description} */`);
    }

    const optional = prop.required ? "" : "?";
    const typeSpec = toTypeSpecType(prop.type);
    lines.push(`  ${prop.name}${optional}: ${typeSpec};`);
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate TypeSpec operation definition
 */
function generateOperation(
  endpoint: EndpointDefinition,
  includeComments: boolean,
): string {
  const lines: string[] = [];

  if (includeComments && endpoint.description) {
    lines.push("  /**");
    lines.push(`   * ${endpoint.description}`);
    lines.push("   */");
  }

  // HTTP method decorator
  lines.push(`  @${endpoint.method}`);

  // Route decorator
  lines.push(`  @route("${endpoint.path}")`);

  // Build parameters string
  const params: string[] = [];

  // Path and query parameters
  for (const param of endpoint.parameters || []) {
    const decorator =
      param.in === "path" ? "@path" : param.in === "query" ? "@query" : "";
    const typeSpec = toTypeSpecType(param.type);
    const optional = param.required ? "" : "?";

    if (decorator) {
      params.push(`${decorator} ${param.name}${optional}: ${typeSpec}`);
    } else if (param.in === "body") {
      params.push(`@body body: ${typeSpec}`);
    }
  }

  // Request body
  if (endpoint.requestBody) {
    params.push(`@body body: ${endpoint.requestBody.type}`);
  }

  // Build response type
  let responseType = "void";
  if (endpoint.responses && endpoint.responses.length > 0) {
    const successResponse = endpoint.responses.find(
      (r) => r.statusCode >= 200 && r.statusCode < 300,
    );
    if (successResponse) {
      responseType = successResponse.type;
    }
  }

  lines.push(`  op ${endpoint.name}(${params.join(", ")}): ${responseType};`);

  return lines.join("\n");
}

/**
 * Generate a complete TypeSpec specification
 *
 * @param spec - API specification input
 * @param configOverrides - Configuration overrides
 * @returns Generated TypeSpec content
 */
export function generateTypeSpec(
  spec: ApiSpecification,
  configOverrides: Partial<TypeSpecGeneratorConfig> = {},
): string {
  const config: TypeSpecGeneratorConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
    namespace:
      spec.namespace || configOverrides.namespace || DEFAULT_CONFIG.namespace,
    serviceTitle: spec.title || DEFAULT_CONFIG.serviceTitle,
    version: spec.version || configOverrides.version || DEFAULT_CONFIG.version,
  };

  const lines: string[] = [];

  // File header
  lines.push("/**");
  lines.push(` * ${config.serviceTitle}`);
  if (spec.description) {
    lines.push(" *");
    lines.push(` * ${spec.description}`);
  }
  lines.push(" *");
  lines.push(" * Generated by Archon Planning Agent");
  lines.push(" */");
  lines.push("");

  // Imports
  lines.push('import "@typespec/http";');
  lines.push('import "@typespec/rest";');
  lines.push('import "@typespec/openapi3";');
  lines.push("");
  lines.push("using TypeSpec.Http;");
  lines.push("using TypeSpec.Rest;");
  lines.push("using OpenAPI;");
  lines.push("");

  // Service decorator
  lines.push("@service({");
  lines.push(`  title: "${config.serviceTitle}",`);
  lines.push("})");

  // Server decorators
  if (config.prodServer) {
    lines.push(`@server("${config.prodServer}", "Production server")`);
  }
  if (config.devServer) {
    lines.push(`@server("${config.devServer}", "Development server")`);
  }

  // Namespace
  lines.push(`namespace ${config.namespace};`);
  lines.push("");

  // Generate types/models
  const enums = spec.types.filter((t) => t.isEnum);
  const models = spec.types.filter((t) => !t.isEnum);

  // Enums first
  for (const enumType of enums) {
    lines.push(generateEnum(enumType, config.includeComments));
    lines.push("");
  }

  // Then models
  for (const model of models) {
    lines.push(generateModel(model, config.includeComments));
    lines.push("");
  }

  // Group endpoints by tag/namespace
  const groupedEndpoints = new Map<string, EndpointDefinition[]>();
  for (const endpoint of spec.endpoints) {
    const tag = endpoint.tags?.[0] || "Api";
    if (!groupedEndpoints.has(tag)) {
      groupedEndpoints.set(tag, []);
    }
    groupedEndpoints.get(tag)!.push(endpoint);
  }

  // Generate namespaced operations
  for (const [tag, endpoints] of groupedEndpoints) {
    if (config.includeComments) {
      lines.push("/**");
      lines.push(` * ${tag} endpoints`);
      lines.push(" */");
    }
    lines.push(`@route("/api/v1/${tag.toLowerCase()}")`);
    lines.push(`namespace ${tag} {`);

    for (const endpoint of endpoints) {
      lines.push(generateOperation(endpoint, config.includeComments));
      lines.push("");
    }

    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate TypeSpec from a TechnicalSpec
 *
 * Extracts API-related information from a technical specification
 * and generates corresponding TypeSpec.
 *
 * @param techSpec - Technical specification from planning
 * @param configOverrides - Configuration overrides
 * @returns Generated TypeSpec content
 */
export function generateTypeSpecFromTechSpec(
  techSpec: TechnicalSpec,
  configOverrides: Partial<TypeSpecGeneratorConfig> = {},
): string {
  // Extract types from architecture files
  const types: TypeDefinition[] = [];
  const endpoints: EndpointDefinition[] = [];

  // Analyze tasks for API-related work
  for (const task of techSpec.tasks) {
    // Look for API endpoint tasks
    if (
      task.category === "feature" &&
      (task.title.toLowerCase().includes("api") ||
        task.title.toLowerCase().includes("endpoint"))
    ) {
      // Try to extract endpoint info from description
      const methodMatch = task.description.match(
        /\b(GET|POST|PUT|PATCH|DELETE)\b/i,
      );
      const pathMatch = task.description.match(/\/[a-z0-9\-_/{}:]+/i);

      if (methodMatch?.[1] && pathMatch?.[0]) {
        endpoints.push({
          name: task.id.toLowerCase().replace(/-/g, "_"),
          method: methodMatch[1].toLowerCase() as EndpointDefinition["method"],
          path: pathMatch[0],
          description: task.title,
          tags: ["Api"],
        });
      }
    }
  }

  // Create a basic API spec from the technical spec
  const apiSpec: ApiSpecification = {
    title: techSpec.title,
    description: techSpec.summary,
    types,
    endpoints,
  };

  return generateTypeSpec(apiSpec, {
    ...configOverrides,
    namespace: techSpec.title.replace(/\s+/g, ""),
  });
}

/**
 * Validate a TypeSpec string for basic syntax errors
 *
 * This is a lightweight validation that checks for common issues.
 * For full validation, use the TypeSpec compiler.
 *
 * @param content - TypeSpec content to validate
 * @returns Validation result with any errors found
 */
export function validateTypeSpecSyntax(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for balanced braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check for balanced parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(
      `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
    );
  }

  // Check for required imports
  if (
    content.includes("@service(") &&
    !content.includes('import "@typespec/')
  ) {
    errors.push("Missing TypeSpec imports for @service decorator");
  }

  // Check for namespace
  if (!content.includes("namespace ")) {
    errors.push("Missing namespace declaration");
  }

  // Check for unclosed strings
  const stringMatches = content.match(/"[^"]*"/g) || [];
  const unclosedQuotes =
    (content.match(/"/g) || []).length - stringMatches.length * 2;
  if (unclosedQuotes !== 0) {
    errors.push("Unclosed string literal detected");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract requirements that can be converted to API specs
 *
 * Analyzes technical tasks and identifies which ones describe
 * API endpoints that can be generated as TypeSpec.
 *
 * @param tasks - Technical tasks from planning
 * @returns Tasks that describe API endpoints
 */
export function extractApiTasks(tasks: TechnicalTask[]): TechnicalTask[] {
  return tasks.filter((task) => {
    const titleLower = task.title.toLowerCase();
    const descLower = task.description.toLowerCase();

    return (
      titleLower.includes("api") ||
      titleLower.includes("endpoint") ||
      titleLower.includes("route") ||
      descLower.includes("http") ||
      descLower.includes("rest") ||
      /\b(GET|POST|PUT|PATCH|DELETE)\b/.test(task.description)
    );
  });
}
