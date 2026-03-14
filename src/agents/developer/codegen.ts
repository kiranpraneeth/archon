/**
 * Code Generation from Specifications — Archon Development Agent
 *
 * Generates TypeScript types, API clients, and server scaffolds from
 * TypeSpec/OpenAPI specifications.
 */

import { z } from "zod";
import type {
  ParsedSpec,
  ModelDefinition,
  ApiOperation,
} from "../planner/spec-parser.js";

/**
 * Generated TypeScript code output
 */
export const GeneratedTypesSchema = z.object({
  /** Generated TypeScript type definitions */
  types: z.string(),
  /** Names of types that were generated */
  typeNames: z.array(z.string()),
  /** Enums that were generated */
  enums: z.array(z.string()),
});

export type GeneratedTypes = z.infer<typeof GeneratedTypesSchema>;

/**
 * Generated API client output
 */
export const GeneratedClientSchema = z.object({
  /** Client class code */
  code: z.string(),
  /** Client class name */
  className: z.string(),
  /** Methods generated */
  methods: z.array(z.string()),
  /** Dependencies required */
  dependencies: z.array(z.string()),
});

export type GeneratedClient = z.infer<typeof GeneratedClientSchema>;

/**
 * Generated server scaffold output
 */
export const GeneratedServerSchema = z.object({
  /** Route handler code */
  code: z.string(),
  /** Routes generated */
  routes: z.array(
    z.object({
      method: z.string(),
      path: z.string(),
      handler: z.string(),
    }),
  ),
  /** Framework used (e.g., express, fastify, hono) */
  framework: z.string(),
  /** Dependencies required */
  dependencies: z.array(z.string()),
});

export type GeneratedServer = z.infer<typeof GeneratedServerSchema>;

/**
 * Complete code generation result
 */
export const CodegenResultSchema = z.object({
  /** Source specification */
  specTitle: z.string(),
  specFormat: z.string(),
  /** Generated types */
  types: GeneratedTypesSchema,
  /** Generated client (optional) */
  client: GeneratedClientSchema.optional(),
  /** Generated server (optional) */
  server: GeneratedServerSchema.optional(),
  /** Generation timestamp */
  generatedAt: z.string(),
  /** Any warnings during generation */
  warnings: z.array(z.string()),
});

export type CodegenResult = z.infer<typeof CodegenResultSchema>;

/**
 * Configuration for code generation
 */
export type CodegenConfig = {
  /** Generate API client */
  generateClient: boolean;
  /** Generate server scaffolds */
  generateServer: boolean;
  /** Server framework to use */
  serverFramework: "express" | "fastify" | "hono";
  /** Use Zod for runtime validation */
  useZodValidation: boolean;
  /** Output style preferences */
  outputStyle: {
    /** Use explicit return types */
    explicitReturnTypes: boolean;
    /** Add JSDoc comments */
    includeJsDoc: boolean;
    /** Use readonly arrays */
    useReadonlyArrays: boolean;
  };
};

/** Default configuration */
const DEFAULT_CONFIG: CodegenConfig = {
  generateClient: true,
  generateServer: true,
  serverFramework: "hono",
  useZodValidation: true,
  outputStyle: {
    explicitReturnTypes: true,
    includeJsDoc: true,
    useReadonlyArrays: true,
  },
};

/**
 * Convert a TypeSpec/OpenAPI type to TypeScript
 */
export function typeToTypeScript(specType: string): string {
  // Handle common TypeSpec types
  const typeMap: Record<string, string> = {
    string: "string",
    int32: "number",
    int64: "number",
    integer: "number",
    float32: "number",
    float64: "number",
    number: "number",
    boolean: "boolean",
    bool: "boolean",
    bytes: "Uint8Array",
    plainDate: "string",
    plainTime: "string",
    utcDateTime: "string",
    duration: "string",
    url: "string",
    void: "void",
    null: "null",
    unknown: "unknown",
    object: "Record<string, unknown>",
  };

  // Direct type mapping
  if (typeMap[specType]) {
    return typeMap[specType];
  }

  // Handle array types: TypeSpec uses "Type[]" or "Array<Type>"
  const arrayMatch = specType.match(/^(.+)\[\]$/);
  if (arrayMatch?.[1]) {
    return `${typeToTypeScript(arrayMatch[1])}[]`;
  }

  // Handle nullable types (Type?)
  const nullableMatch = specType.match(/^(.+)\?$/);
  if (nullableMatch?.[1]) {
    return `${typeToTypeScript(nullableMatch[1])} | null`;
  }

  // Handle union types
  if (specType.includes("|")) {
    const unionTypes = specType.split("|").map((t) => t.trim());
    return unionTypes.map((t) => typeToTypeScript(t)).join(" | ");
  }

  // Handle literal string types (e.g., "active" | "inactive")
  if (specType.startsWith('"') && specType.endsWith('"')) {
    return specType; // Keep as literal
  }

  // Handle Record/Map types
  const recordMatch = specType.match(/^Record<(.+),\s*(.+)>$/);
  if (recordMatch?.[1] && recordMatch?.[2]) {
    return `Record<${typeToTypeScript(recordMatch[1])}, ${typeToTypeScript(recordMatch[2])}>`;
  }

  // Assume it's a custom type reference
  return specType;
}

/**
 * Generate TypeScript type definition from a model
 */
export function generateTypeFromModel(
  model: ModelDefinition,
  config: CodegenConfig = DEFAULT_CONFIG,
): string {
  const lines: string[] = [];

  // JSDoc comment
  if (config.outputStyle.includeJsDoc && model.description) {
    lines.push("/**");
    lines.push(` * ${model.description}`);
    lines.push(" */");
  }

  // Enum type
  if (model.isEnum && model.enumValues) {
    lines.push(`export const ${model.name} = {`);
    for (const value of model.enumValues) {
      const enumKey = value.toUpperCase();
      lines.push(`  ${enumKey}: "${value}",`);
    }
    lines.push("} as const;");
    lines.push("");
    lines.push(
      `export type ${model.name} = (typeof ${model.name})[keyof typeof ${model.name}];`,
    );
    return lines.join("\n");
  }

  // Object type
  lines.push(`export type ${model.name} = {`);

  for (const prop of model.properties) {
    // Property JSDoc
    if (config.outputStyle.includeJsDoc && prop.description) {
      lines.push(`  /** ${prop.description} */`);
    }

    const optional = prop.required ? "" : "?";
    let tsType = typeToTypeScript(prop.type);

    // Use readonly arrays if configured
    if (
      config.outputStyle.useReadonlyArrays &&
      (tsType.endsWith("[]") || tsType.startsWith("Array<"))
    ) {
      tsType = tsType.replace(/\[\]$/, "").replace(/^Array<(.+)>$/, "$1");
      tsType = `readonly ${tsType}[]`;
    }

    lines.push(`  ${prop.name}${optional}: ${tsType};`);
  }

  lines.push("};");

  return lines.join("\n");
}

/**
 * Generate Zod schema from a model
 */
export function generateZodSchemaFromModel(model: ModelDefinition): string {
  const lines: string[] = [];

  // Enum schema
  if (model.isEnum && model.enumValues) {
    const enumLiterals = model.enumValues.map((v) => `"${v}"`).join(", ");
    lines.push(`export const ${model.name}Schema = z.enum([${enumLiterals}]);`);
    return lines.join("\n");
  }

  // Object schema
  lines.push(`export const ${model.name}Schema = z.object({`);

  for (const prop of model.properties) {
    let zodType = typeToZodType(prop.type);

    if (!prop.required) {
      zodType = `${zodType}.optional()`;
    }

    lines.push(`  ${prop.name}: ${zodType},`);
  }

  lines.push("});");

  return lines.join("\n");
}

/**
 * Convert a type to Zod schema type
 */
function typeToZodType(specType: string): string {
  const typeMap: Record<string, string> = {
    string: "z.string()",
    int32: "z.number().int()",
    int64: "z.number().int()",
    integer: "z.number().int()",
    float32: "z.number()",
    float64: "z.number()",
    number: "z.number()",
    boolean: "z.boolean()",
    bool: "z.boolean()",
    void: "z.void()",
    unknown: "z.unknown()",
  };

  if (typeMap[specType]) {
    return typeMap[specType];
  }

  // Handle array types
  const arrayMatch = specType.match(/^(.+)\[\]$/);
  if (arrayMatch?.[1]) {
    return `z.array(${typeToZodType(arrayMatch[1])})`;
  }

  // Handle nullable types
  const nullableMatch = specType.match(/^(.+)\?$/);
  if (nullableMatch?.[1]) {
    return `${typeToZodType(nullableMatch[1])}.nullable()`;
  }

  // Assume custom type has its own schema
  return `${specType}Schema`;
}

/**
 * Generate all TypeScript types from a parsed spec
 */
export function generateTypesFromSpec(
  spec: ParsedSpec,
  config: CodegenConfig = DEFAULT_CONFIG,
): GeneratedTypes {
  const typeDefinitions: string[] = [];
  const typeNames: string[] = [];
  const enums: string[] = [];

  // Header comment
  typeDefinitions.push("/**");
  typeDefinitions.push(` * Generated types from ${spec.title}`);
  typeDefinitions.push(` * Format: ${spec.format}`);
  typeDefinitions.push(` * Generated at: ${new Date().toISOString()}`);
  typeDefinitions.push(" * DO NOT EDIT - This file is auto-generated");
  typeDefinitions.push(" */");
  typeDefinitions.push("");

  if (config.useZodValidation) {
    typeDefinitions.push('import { z } from "zod";');
    typeDefinitions.push("");
  }

  // Generate types for each model
  for (const model of spec.models) {
    typeDefinitions.push(generateTypeFromModel(model, config));
    typeDefinitions.push("");

    if (config.useZodValidation) {
      typeDefinitions.push(generateZodSchemaFromModel(model));
      typeDefinitions.push("");
    }

    typeNames.push(model.name);
    if (model.isEnum) {
      enums.push(model.name);
    }
  }

  return {
    types: typeDefinitions.join("\n"),
    typeNames,
    enums,
  };
}

/**
 * Generate an API client from a parsed spec
 */
export function generateClientFromSpec(
  spec: ParsedSpec,
  config: CodegenConfig = DEFAULT_CONFIG,
): GeneratedClient {
  const lines: string[] = [];
  const methods: string[] = [];
  const dependencies = ["fetch"];

  // Header
  lines.push("/**");
  lines.push(` * API Client for ${spec.title}`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(" * DO NOT EDIT - This file is auto-generated");
  lines.push(" */");
  lines.push("");

  // Import types
  const typeImports = spec.models
    .filter((m) => !m.isEnum)
    .map((m) => m.name)
    .join(", ");
  if (typeImports) {
    lines.push(`import type { ${typeImports} } from "./types.js";`);
    lines.push("");
  }

  // Client config type
  lines.push("export type ClientConfig = {");
  lines.push("  baseUrl: string;");
  lines.push("  headers?: Record<string, string>;");
  lines.push("  fetch?: typeof fetch;");
  lines.push("};");
  lines.push("");

  // Client class
  const className = `${toPascalCase(spec.title.replace(/\s+API$/i, ""))}Client`;
  lines.push(`export class ${className} {`);
  lines.push("  private readonly baseUrl: string;");
  lines.push("  private readonly headers: Record<string, string>;");
  lines.push("  private readonly fetchFn: typeof fetch;");
  lines.push("");

  // Constructor
  lines.push("  constructor(config: ClientConfig) {");
  lines.push('    this.baseUrl = config.baseUrl.replace(/\\/$/, "");');
  lines.push(
    '    this.headers = config.headers ?? { "Content-Type": "application/json" };',
  );
  lines.push("    this.fetchFn = config.fetch ?? fetch;");
  lines.push("  }");
  lines.push("");

  // Private request method
  lines.push("  private async request<T>(");
  lines.push("    method: string,");
  lines.push("    path: string,");
  lines.push("    body?: unknown,");
  lines.push("  ): Promise<T> {");
  lines.push("    const url = `${this.baseUrl}${path}`;");
  lines.push("    const response = await this.fetchFn(url, {");
  lines.push("      method,");
  lines.push("      headers: this.headers,");
  lines.push("      body: body ? JSON.stringify(body) : undefined,");
  lines.push("    });");
  lines.push("");
  lines.push("    if (!response.ok) {");
  lines.push(
    "      throw new Error(`HTTP ${response.status}: ${response.statusText}`);",
  );
  lines.push("    }");
  lines.push("");
  lines.push("    return response.json() as Promise<T>;");
  lines.push("  }");

  // Generate methods for each operation
  for (const operation of spec.operations) {
    lines.push("");
    const methodLines = generateClientMethod(operation, config);
    lines.push(...methodLines.map((l) => `  ${l}`));
    methods.push(operation.operationId);
  }

  lines.push("}");

  return {
    code: lines.join("\n"),
    className,
    methods,
    dependencies,
  };
}

/**
 * Generate a client method for an operation
 */
function generateClientMethod(
  operation: ApiOperation,
  config: CodegenConfig,
): string[] {
  const lines: string[] = [];
  const methodName = toCamelCase(operation.operationId);

  // JSDoc
  if (config.outputStyle.includeJsDoc) {
    lines.push("/**");
    if (operation.summary) {
      lines.push(` * ${operation.summary}`);
    }
    if (operation.description) {
      lines.push(` * ${operation.description}`);
    }
    lines.push(" */");
  }

  // Build parameters
  const pathParams = operation.parameters.filter((p) => p.in === "path");
  const queryParams = operation.parameters.filter((p) => p.in === "query");
  const hasBody =
    operation.requestBody ||
    operation.method === "post" ||
    operation.method === "put";

  // Parameter list
  const params: string[] = [];
  for (const param of pathParams) {
    params.push(`${param.name}: ${typeToTypeScript(param.type)}`);
  }
  if (hasBody && operation.requestBody) {
    params.push(`body: ${operation.requestBody}`);
  } else if (hasBody) {
    params.push("body?: unknown");
  }
  if (queryParams.length > 0) {
    const queryType = queryParams
      .map((p) => {
        const opt = p.required ? "" : "?";
        return `${p.name}${opt}: ${typeToTypeScript(p.type)}`;
      })
      .join("; ");
    params.push(`query?: { ${queryType} }`);
  }

  // Return type from responses
  const successResponse = operation.responses.find(
    (r) => r.statusCode >= 200 && r.statusCode < 300,
  );
  const returnType = successResponse?.schema || "unknown";

  // Method signature
  const signature = `async ${methodName}(${params.join(", ")}): Promise<${returnType}>`;
  lines.push(`${signature} {`);

  // Build path with parameters
  let path = operation.path;
  for (const param of pathParams) {
    path = path.replace(`{${param.name}}`, `\${${param.name}}`);
  }

  // Add query string if needed
  if (queryParams.length > 0) {
    lines.push("  let pathWithQuery = `" + path + "`;");
    lines.push("  if (query) {");
    lines.push("    const searchParams = new URLSearchParams();");
    for (const param of queryParams) {
      lines.push(`    if (query.${param.name} !== undefined) {`);
      lines.push(
        `      searchParams.set("${param.name}", String(query.${param.name}));`,
      );
      lines.push("    }");
    }
    lines.push("    const qs = searchParams.toString();");
    lines.push("    if (qs) pathWithQuery += `?${qs}`;");
    lines.push("  }");
    lines.push(
      `  return this.request<${returnType}>("${operation.method.toUpperCase()}", pathWithQuery${hasBody ? ", body" : ""});`,
    );
  } else {
    lines.push(
      `  return this.request<${returnType}>("${operation.method.toUpperCase()}", \`${path}\`${hasBody ? ", body" : ""});`,
    );
  }

  lines.push("}");

  return lines;
}

/**
 * Generate server scaffolds from a parsed spec
 */
export function generateServerFromSpec(
  spec: ParsedSpec,
  config: CodegenConfig = DEFAULT_CONFIG,
): GeneratedServer {
  const framework = config.serverFramework;

  switch (framework) {
    case "hono":
      return generateHonoServer(spec, config);
    case "express":
      return generateExpressServer(spec, config);
    case "fastify":
      return generateFastifyServer(spec, config);
    default:
      return generateHonoServer(spec, config);
  }
}

/**
 * Generate Hono server scaffolds
 */
function generateHonoServer(
  spec: ParsedSpec,
  config: CodegenConfig,
): GeneratedServer {
  const lines: string[] = [];
  const routes: GeneratedServer["routes"] = [];
  const dependencies = ["hono"];

  if (config.useZodValidation) {
    dependencies.push("@hono/zod-validator");
  }

  // Header
  lines.push("/**");
  lines.push(` * API Server for ${spec.title}`);
  lines.push(` * Framework: Hono`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(" * DO NOT EDIT - This file is auto-generated");
  lines.push(" */");
  lines.push("");

  // Imports
  lines.push('import { Hono } from "hono";');
  if (config.useZodValidation) {
    lines.push('import { zValidator } from "@hono/zod-validator";');
  }
  lines.push("");

  // Import types
  const typeImports = spec.models.map((m) => m.name).join(", ");
  if (typeImports) {
    lines.push(`import type { ${typeImports} } from "./types.js";`);
    if (config.useZodValidation) {
      const schemaImports = spec.models
        .map((m) => `${m.name}Schema`)
        .join(", ");
      lines.push(`import { ${schemaImports} } from "./types.js";`);
    }
    lines.push("");
  }

  // Create app
  lines.push("const app = new Hono();");
  lines.push("");

  // Group operations by namespace/tag
  const operationsByTag = new Map<string, ApiOperation[]>();
  for (const op of spec.operations) {
    const tag = op.tags[0] || "default";
    const existing = operationsByTag.get(tag) ?? [];
    existing.push(op);
    operationsByTag.set(tag, existing);
  }

  // Generate routes for each namespace
  for (const [tag, operations] of operationsByTag) {
    if (tag !== "default") {
      lines.push(`// ${tag} routes`);
    }

    for (const operation of operations) {
      const routeLines = generateHonoRoute(operation, config);
      lines.push(...routeLines);
      lines.push("");

      // Convert path params from {param} to :param for route storage
      const routePath = operation.path.replace(/{(\w+)}/g, ":$1");
      routes.push({
        method: operation.method.toUpperCase(),
        path: routePath,
        handler: toCamelCase(operation.operationId),
      });
    }
  }

  // Export
  lines.push("export { app };");

  return {
    code: lines.join("\n"),
    routes,
    framework: "hono",
    dependencies,
  };
}

/**
 * Generate a Hono route
 */
function generateHonoRoute(
  operation: ApiOperation,
  config: CodegenConfig,
): string[] {
  const lines: string[] = [];
  const method = operation.method;
  const handlerName = toCamelCase(operation.operationId);

  // JSDoc
  if (config.outputStyle.includeJsDoc && operation.summary) {
    lines.push(`/** ${operation.summary} */`);
  }

  // Convert path params from {param} to :param
  const path = operation.path.replace(/{(\w+)}/g, ":$1");

  // Validation middleware
  const hasBody = operation.requestBody && config.useZodValidation;
  const validator = hasBody
    ? `zValidator("json", ${operation.requestBody}Schema), `
    : "";

  // Route handler
  lines.push(`app.${method}("${path}", ${validator}async (c) => {`);

  // Extract path parameters
  const pathParams = operation.parameters.filter((p) => p.in === "path");
  if (pathParams.length > 0) {
    for (const param of pathParams) {
      lines.push(`  const ${param.name} = c.req.param("${param.name}");`);
    }
  }

  // Extract validated body
  if (hasBody) {
    lines.push("  const body = c.req.valid('json');");
  }

  // TODO placeholder
  lines.push("");
  lines.push(`  // TODO: Implement ${handlerName} handler`);
  lines.push("");

  // Return placeholder response
  lines.push('  return c.json({ message: "Not implemented" }, 501);');
  lines.push("});");

  return lines;
}

/**
 * Generate Express server scaffolds
 */
function generateExpressServer(
  spec: ParsedSpec,
  config: CodegenConfig,
): GeneratedServer {
  const lines: string[] = [];
  const routes: GeneratedServer["routes"] = [];
  const dependencies = ["express", "@types/express"];

  // Header
  lines.push("/**");
  lines.push(` * API Server for ${spec.title}`);
  lines.push(` * Framework: Express`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(" * DO NOT EDIT - This file is auto-generated");
  lines.push(" */");
  lines.push("");

  // Imports
  lines.push('import express from "express";');
  lines.push('import type { Request, Response } from "express";');
  lines.push("");

  // Create router
  lines.push("const router = express.Router();");
  lines.push("");

  // Generate routes
  for (const operation of spec.operations) {
    const method = operation.method;
    const path = operation.path.replace(/{(\w+)}/g, ":$1");
    const handlerName = toCamelCase(operation.operationId);

    if (config.outputStyle.includeJsDoc && operation.summary) {
      lines.push(`/** ${operation.summary} */`);
    }

    lines.push(
      `router.${method}("${path}", async (req: Request, res: Response) => {`,
    );
    lines.push(`  // TODO: Implement ${handlerName} handler`);
    lines.push('  res.status(501).json({ message: "Not implemented" });');
    lines.push("});");
    lines.push("");

    routes.push({
      method: method.toUpperCase(),
      path,
      handler: handlerName,
    });
  }

  // Export
  lines.push("export { router };");

  return {
    code: lines.join("\n"),
    routes,
    framework: "express",
    dependencies,
  };
}

/**
 * Generate Fastify server scaffolds
 */
function generateFastifyServer(
  spec: ParsedSpec,
  config: CodegenConfig,
): GeneratedServer {
  const lines: string[] = [];
  const routes: GeneratedServer["routes"] = [];
  const dependencies = ["fastify"];

  // Header
  lines.push("/**");
  lines.push(` * API Server for ${spec.title}`);
  lines.push(` * Framework: Fastify`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(" * DO NOT EDIT - This file is auto-generated");
  lines.push(" */");
  lines.push("");

  // Imports
  lines.push('import Fastify from "fastify";');
  lines.push(
    'import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";',
  );
  lines.push("");

  // Plugin function
  lines.push(
    "async function routes(fastify: FastifyInstance): Promise<void> {",
  );

  // Generate routes
  for (const operation of spec.operations) {
    const method = operation.method;
    const path = operation.path.replace(/{(\w+)}/g, ":$1");
    const handlerName = toCamelCase(operation.operationId);

    lines.push("");
    if (config.outputStyle.includeJsDoc && operation.summary) {
      lines.push(`  /** ${operation.summary} */`);
    }

    lines.push(
      `  fastify.${method}("${path}", async (request: FastifyRequest, reply: FastifyReply) => {`,
    );
    lines.push(`    // TODO: Implement ${handlerName} handler`);
    lines.push(
      '    return reply.code(501).send({ message: "Not implemented" });',
    );
    lines.push("  });");

    routes.push({
      method: method.toUpperCase(),
      path,
      handler: handlerName,
    });
  }

  lines.push("}");
  lines.push("");

  // Export
  lines.push("export { routes };");

  return {
    code: lines.join("\n"),
    routes,
    framework: "fastify",
    dependencies,
  };
}

/**
 * Generate code from a specification
 *
 * This is the main entry point for code generation.
 *
 * @param spec - Parsed specification from spec-parser
 * @param configOverrides - Configuration overrides
 * @returns Complete code generation result
 *
 * @example
 * ```typescript
 * import { parseSpec } from "../planner/spec-parser.js";
 * import { generateCodeFromSpec } from "./codegen.js";
 *
 * const spec = parseSpec(typeSpecContent);
 * const result = generateCodeFromSpec(spec, {
 *   generateClient: true,
 *   generateServer: true,
 *   serverFramework: "hono",
 * });
 *
 * // Write generated files
 * fs.writeFileSync("src/types.ts", result.types.types);
 * fs.writeFileSync("src/client.ts", result.client.code);
 * fs.writeFileSync("src/server.ts", result.server.code);
 * ```
 */
export function generateCodeFromSpec(
  spec: ParsedSpec,
  configOverrides: Partial<CodegenConfig> = {},
): CodegenResult {
  const config: CodegenConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
    outputStyle: {
      ...DEFAULT_CONFIG.outputStyle,
      ...configOverrides.outputStyle,
    },
  };

  const warnings: string[] = [];

  // Generate types
  const types = generateTypesFromSpec(spec, config);

  // Generate client (optional)
  let client: GeneratedClient | undefined;
  if (config.generateClient) {
    if (spec.operations.length === 0) {
      warnings.push("No operations found in spec - skipping client generation");
    } else {
      client = generateClientFromSpec(spec, config);
    }
  }

  // Generate server (optional)
  let server: GeneratedServer | undefined;
  if (config.generateServer) {
    if (spec.operations.length === 0) {
      warnings.push("No operations found in spec - skipping server generation");
    } else {
      server = generateServerFromSpec(spec, config);
    }
  }

  return {
    specTitle: spec.title,
    specFormat: spec.format,
    types,
    client,
    server,
    generatedAt: new Date().toISOString(),
    warnings,
  };
}

/**
 * Format code generation result as markdown
 */
export function formatCodegenResult(result: CodegenResult): string {
  const lines: string[] = [];

  lines.push(`# Code Generation: ${result.specTitle}`);
  lines.push("");
  lines.push(`**Source Format:** ${result.specFormat}`);
  lines.push(`**Generated:** ${result.generatedAt}`);
  lines.push("");

  // Warnings
  if (result.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  // Types summary
  lines.push("## Generated Types");
  lines.push("");
  lines.push(`- **Types:** ${result.types.typeNames.length}`);
  lines.push(`- **Enums:** ${result.types.enums.length}`);
  lines.push("");

  if (result.types.typeNames.length > 0) {
    lines.push("### Type Names");
    lines.push("");
    for (const name of result.types.typeNames) {
      const isEnum = result.types.enums.includes(name);
      lines.push(`- \`${name}\`${isEnum ? " (enum)" : ""}`);
    }
    lines.push("");
  }

  // Client summary
  if (result.client) {
    lines.push("## Generated Client");
    lines.push("");
    lines.push(`- **Class:** \`${result.client.className}\``);
    lines.push(`- **Methods:** ${result.client.methods.length}`);
    lines.push(`- **Dependencies:** ${result.client.dependencies.join(", ")}`);
    lines.push("");

    if (result.client.methods.length > 0) {
      lines.push("### Client Methods");
      lines.push("");
      for (const method of result.client.methods) {
        lines.push(`- \`${method}()\``);
      }
      lines.push("");
    }
  }

  // Server summary
  if (result.server) {
    lines.push("## Generated Server");
    lines.push("");
    lines.push(`- **Framework:** ${result.server.framework}`);
    lines.push(`- **Routes:** ${result.server.routes.length}`);
    lines.push(`- **Dependencies:** ${result.server.dependencies.join(", ")}`);
    lines.push("");

    if (result.server.routes.length > 0) {
      lines.push("### Routes");
      lines.push("");
      lines.push("| Method | Path | Handler |");
      lines.push("|--------|------|---------|");
      for (const route of result.server.routes) {
        lines.push(
          `| ${route.method} | \`${route.path}\` | \`${route.handler}\` |`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// Helper functions

function toPascalCase(str: string): string {
  // If already PascalCase or camelCase, preserve internal casing
  if (!/[\s_-]/.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function toCamelCase(str: string): string {
  // If already camelCase, return as-is
  if (!/[\s_-]/.test(str) && str.charAt(0) === str.charAt(0).toLowerCase()) {
    return str;
  }
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
