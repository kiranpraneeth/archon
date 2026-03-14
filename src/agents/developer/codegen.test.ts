/**
 * Tests for Code Generation Module
 */

import { describe, it, expect } from "vitest";
import {
  typeToTypeScript,
  generateTypeFromModel,
  generateZodSchemaFromModel,
  generateTypesFromSpec,
  generateClientFromSpec,
  generateServerFromSpec,
  generateCodeFromSpec,
  formatCodegenResult,
  GeneratedTypesSchema,
  GeneratedClientSchema,
  GeneratedServerSchema,
  CodegenResultSchema,
} from "./codegen.js";
import type { ParsedSpec, ModelDefinition } from "../planner/spec-parser.js";

describe("codegen", () => {
  describe("typeToTypeScript", () => {
    it("should convert basic TypeSpec types to TypeScript", () => {
      expect(typeToTypeScript("string")).toBe("string");
      expect(typeToTypeScript("int32")).toBe("number");
      expect(typeToTypeScript("int64")).toBe("number");
      expect(typeToTypeScript("float32")).toBe("number");
      expect(typeToTypeScript("float64")).toBe("number");
      expect(typeToTypeScript("boolean")).toBe("boolean");
      expect(typeToTypeScript("bool")).toBe("boolean");
    });

    it("should convert array types", () => {
      expect(typeToTypeScript("string[]")).toBe("string[]");
      expect(typeToTypeScript("int32[]")).toBe("number[]");
      expect(typeToTypeScript("User[]")).toBe("User[]");
    });

    it("should convert nullable types", () => {
      expect(typeToTypeScript("string?")).toBe("string | null");
      expect(typeToTypeScript("User?")).toBe("User | null");
    });

    it("should convert union types", () => {
      expect(typeToTypeScript("string | number")).toBe("string | number");
      expect(typeToTypeScript('"active" | "inactive"')).toBe(
        '"active" | "inactive"',
      );
    });

    it("should preserve custom type references", () => {
      expect(typeToTypeScript("User")).toBe("User");
      expect(typeToTypeScript("FeedbackItem")).toBe("FeedbackItem");
    });

    it("should handle bytes type", () => {
      expect(typeToTypeScript("bytes")).toBe("Uint8Array");
    });

    it("should handle date/time types", () => {
      expect(typeToTypeScript("plainDate")).toBe("string");
      expect(typeToTypeScript("utcDateTime")).toBe("string");
    });
  });

  describe("generateTypeFromModel", () => {
    const objectModel: ModelDefinition = {
      name: "User",
      description: "A user in the system",
      properties: [
        { name: "id", type: "string", required: true, description: "User ID" },
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: false },
        { name: "age", type: "int32", required: false },
      ],
      isEnum: false,
    };

    const enumModel: ModelDefinition = {
      name: "Status",
      description: "User status",
      properties: [],
      isEnum: true,
      enumValues: ["active", "inactive", "pending"],
    };

    it("should generate TypeScript type for object model", () => {
      const result = generateTypeFromModel(objectModel);

      expect(result).toContain("export type User = {");
      expect(result).toContain("id: string;");
      expect(result).toContain("name: string;");
      expect(result).toContain("email?: string;");
      expect(result).toContain("age?: number;");
      expect(result).toContain("};");
    });

    it("should include JSDoc comments by default", () => {
      const result = generateTypeFromModel(objectModel);

      expect(result).toContain("/**");
      expect(result).toContain("* A user in the system");
      expect(result).toContain("/** User ID */");
    });

    it("should generate const enum pattern for enum model", () => {
      const result = generateTypeFromModel(enumModel);

      expect(result).toContain("export const Status = {");
      expect(result).toContain('ACTIVE: "active",');
      expect(result).toContain('INACTIVE: "inactive",');
      expect(result).toContain('PENDING: "pending",');
      expect(result).toContain("} as const;");
      expect(result).toContain(
        "export type Status = (typeof Status)[keyof typeof Status];",
      );
    });

    it("should skip JSDoc when configured", () => {
      const result = generateTypeFromModel(objectModel, {
        generateClient: false,
        generateServer: false,
        serverFramework: "hono",
        useZodValidation: false,
        outputStyle: {
          explicitReturnTypes: true,
          includeJsDoc: false,
          useReadonlyArrays: false,
        },
      });

      expect(result).not.toContain("/**");
      expect(result).not.toContain("A user in the system");
    });

    it("should use readonly arrays when configured", () => {
      const modelWithArray: ModelDefinition = {
        name: "Team",
        properties: [{ name: "members", type: "User[]", required: true }],
        isEnum: false,
      };

      const result = generateTypeFromModel(modelWithArray, {
        generateClient: false,
        generateServer: false,
        serverFramework: "hono",
        useZodValidation: true,
        outputStyle: {
          explicitReturnTypes: true,
          includeJsDoc: true,
          useReadonlyArrays: true,
        },
      });

      expect(result).toContain("readonly User[]");
    });
  });

  describe("generateZodSchemaFromModel", () => {
    const objectModel: ModelDefinition = {
      name: "User",
      properties: [
        { name: "id", type: "string", required: true },
        { name: "age", type: "int32", required: false },
      ],
      isEnum: false,
    };

    const enumModel: ModelDefinition = {
      name: "Status",
      properties: [],
      isEnum: true,
      enumValues: ["active", "inactive"],
    };

    it("should generate Zod schema for object model", () => {
      const result = generateZodSchemaFromModel(objectModel);

      expect(result).toContain("export const UserSchema = z.object({");
      expect(result).toContain("id: z.string(),");
      expect(result).toContain("age: z.number().int().optional(),");
      expect(result).toContain("});");
    });

    it("should generate Zod enum schema for enum model", () => {
      const result = generateZodSchemaFromModel(enumModel);

      expect(result).toContain(
        'export const StatusSchema = z.enum(["active", "inactive"]);',
      );
    });
  });

  describe("generateTypesFromSpec", () => {
    const mockSpec: ParsedSpec = {
      format: "typespec",
      title: "Test API",
      servers: [],
      operations: [],
      models: [
        {
          name: "User",
          description: "A user",
          properties: [
            { name: "id", type: "string", required: true },
            { name: "name", type: "string", required: true },
          ],
          isEnum: false,
        },
        {
          name: "Status",
          properties: [],
          isEnum: true,
          enumValues: ["active", "inactive"],
        },
      ],
      namespaces: [],
      imports: [],
      rawContent: "",
    };

    it("should generate types for all models", () => {
      const result = generateTypesFromSpec(mockSpec);

      expect(result.typeNames).toContain("User");
      expect(result.typeNames).toContain("Status");
      expect(result.enums).toContain("Status");
      expect(result.enums).not.toContain("User");
    });

    it("should include header comment", () => {
      const result = generateTypesFromSpec(mockSpec);

      expect(result.types).toContain("Generated types from Test API");
      expect(result.types).toContain("DO NOT EDIT");
    });

    it("should include Zod import when configured", () => {
      const result = generateTypesFromSpec(mockSpec, {
        generateClient: false,
        generateServer: false,
        serverFramework: "hono",
        useZodValidation: true,
        outputStyle: {
          explicitReturnTypes: true,
          includeJsDoc: true,
          useReadonlyArrays: true,
        },
      });

      expect(result.types).toContain('import { z } from "zod";');
    });

    it("should validate against schema", () => {
      const result = generateTypesFromSpec(mockSpec);
      const parsed = GeneratedTypesSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("generateClientFromSpec", () => {
    const mockSpec: ParsedSpec = {
      format: "openapi",
      title: "Test API",
      servers: [{ url: "https://api.example.com" }],
      operations: [
        {
          operationId: "getUser",
          method: "get",
          path: "/users/{id}",
          summary: "Get a user by ID",
          parameters: [
            { name: "id", in: "path", type: "string", required: true },
          ],
          responses: [{ statusCode: 200, schema: "User" }],
          tags: [],
        },
        {
          operationId: "createUser",
          method: "post",
          path: "/users",
          summary: "Create a new user",
          parameters: [],
          requestBody: "CreateUserRequest",
          responses: [{ statusCode: 201, schema: "User" }],
          tags: [],
        },
      ],
      models: [
        {
          name: "User",
          properties: [{ name: "id", type: "string", required: true }],
          isEnum: false,
        },
      ],
      namespaces: [],
      imports: [],
      rawContent: "",
    };

    it("should generate client class", () => {
      const result = generateClientFromSpec(mockSpec);

      expect(result.className).toBe("TestClient");
      expect(result.code).toContain("export class TestClient {");
    });

    it("should generate methods for operations", () => {
      const result = generateClientFromSpec(mockSpec);

      expect(result.methods).toContain("getUser");
      expect(result.methods).toContain("createUser");
      expect(result.code).toContain("async getUser(");
      expect(result.code).toContain("async createUser(");
    });

    it("should handle path parameters", () => {
      const result = generateClientFromSpec(mockSpec);

      expect(result.code).toContain("getUser(id: string)");
      expect(result.code).toContain("${id}");
    });

    it("should handle request body", () => {
      const result = generateClientFromSpec(mockSpec);

      expect(result.code).toContain("createUser(body: CreateUserRequest)");
    });

    it("should include JSDoc comments", () => {
      const result = generateClientFromSpec(mockSpec);

      // JSDoc comments may be multi-line
      expect(result.code).toContain("Get a user by ID");
      expect(result.code).toContain("Create a new user");
    });

    it("should validate against schema", () => {
      const result = generateClientFromSpec(mockSpec);
      const parsed = GeneratedClientSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("generateServerFromSpec", () => {
    const mockSpec: ParsedSpec = {
      format: "typespec",
      title: "Test API",
      servers: [],
      operations: [
        {
          operationId: "getUsers",
          method: "get",
          path: "/users",
          summary: "List all users",
          parameters: [],
          responses: [{ statusCode: 200 }],
          tags: ["Users"],
        },
        {
          operationId: "getUser",
          method: "get",
          path: "/users/{id}",
          parameters: [
            { name: "id", in: "path", type: "string", required: true },
          ],
          responses: [{ statusCode: 200 }],
          tags: ["Users"],
        },
      ],
      models: [],
      namespaces: [],
      imports: [],
      rawContent: "",
    };

    describe("Hono framework", () => {
      it("should generate Hono server code", () => {
        const result = generateServerFromSpec(mockSpec, {
          generateClient: false,
          generateServer: true,
          serverFramework: "hono",
          useZodValidation: false,
          outputStyle: {
            explicitReturnTypes: true,
            includeJsDoc: true,
            useReadonlyArrays: true,
          },
        });

        expect(result.framework).toBe("hono");
        expect(result.code).toContain('import { Hono } from "hono"');
        expect(result.code).toContain("const app = new Hono()");
      });

      it("should generate routes with correct methods", () => {
        const result = generateServerFromSpec(mockSpec, {
          generateClient: false,
          generateServer: true,
          serverFramework: "hono",
          useZodValidation: false,
          outputStyle: {
            explicitReturnTypes: true,
            includeJsDoc: true,
            useReadonlyArrays: true,
          },
        });

        expect(result.routes).toHaveLength(2);
        expect(result.routes[0]?.method).toBe("GET");
        expect(result.routes[0]?.path).toBe("/users");
        expect(result.routes[1]?.path).toBe("/users/:id");
      });

      it("should include TODO placeholders", () => {
        const result = generateServerFromSpec(mockSpec, {
          generateClient: false,
          generateServer: true,
          serverFramework: "hono",
          useZodValidation: false,
          outputStyle: {
            explicitReturnTypes: true,
            includeJsDoc: true,
            useReadonlyArrays: true,
          },
        });

        expect(result.code).toContain("// TODO: Implement getUsers handler");
        expect(result.code).toContain("// TODO: Implement getUser handler");
      });
    });

    describe("Express framework", () => {
      it("should generate Express server code", () => {
        const result = generateServerFromSpec(mockSpec, {
          generateClient: false,
          generateServer: true,
          serverFramework: "express",
          useZodValidation: false,
          outputStyle: {
            explicitReturnTypes: true,
            includeJsDoc: true,
            useReadonlyArrays: true,
          },
        });

        expect(result.framework).toBe("express");
        expect(result.code).toContain('import express from "express"');
        expect(result.code).toContain("const router = express.Router()");
      });

      it("should list express as dependency", () => {
        const result = generateServerFromSpec(mockSpec, {
          generateClient: false,
          generateServer: true,
          serverFramework: "express",
          useZodValidation: false,
          outputStyle: {
            explicitReturnTypes: true,
            includeJsDoc: true,
            useReadonlyArrays: true,
          },
        });

        expect(result.dependencies).toContain("express");
        expect(result.dependencies).toContain("@types/express");
      });
    });

    describe("Fastify framework", () => {
      it("should generate Fastify server code", () => {
        const result = generateServerFromSpec(mockSpec, {
          generateClient: false,
          generateServer: true,
          serverFramework: "fastify",
          useZodValidation: false,
          outputStyle: {
            explicitReturnTypes: true,
            includeJsDoc: true,
            useReadonlyArrays: true,
          },
        });

        expect(result.framework).toBe("fastify");
        expect(result.code).toContain('import Fastify from "fastify"');
        expect(result.code).toContain("async function routes(fastify");
      });
    });

    it("should validate against schema", () => {
      const result = generateServerFromSpec(mockSpec);
      const parsed = GeneratedServerSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("generateCodeFromSpec", () => {
    const mockSpec: ParsedSpec = {
      format: "typespec",
      title: "Full API",
      servers: [],
      operations: [
        {
          operationId: "listItems",
          method: "get",
          path: "/items",
          parameters: [],
          responses: [{ statusCode: 200 }],
          tags: [],
        },
      ],
      models: [
        {
          name: "Item",
          properties: [{ name: "id", type: "string", required: true }],
          isEnum: false,
        },
      ],
      namespaces: [],
      imports: [],
      rawContent: "",
    };

    it("should generate complete code generation result", () => {
      const result = generateCodeFromSpec(mockSpec);

      expect(result.specTitle).toBe("Full API");
      expect(result.specFormat).toBe("typespec");
      expect(result.types).toBeDefined();
      expect(result.client).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it("should skip client when configured", () => {
      const result = generateCodeFromSpec(mockSpec, {
        generateClient: false,
      });

      expect(result.client).toBeUndefined();
      expect(result.server).toBeDefined();
    });

    it("should skip server when configured", () => {
      const result = generateCodeFromSpec(mockSpec, {
        generateServer: false,
      });

      expect(result.client).toBeDefined();
      expect(result.server).toBeUndefined();
    });

    it("should add warnings for empty operations", () => {
      const emptySpec: ParsedSpec = {
        ...mockSpec,
        operations: [],
      };

      const result = generateCodeFromSpec(emptySpec);

      expect(result.warnings).toContain(
        "No operations found in spec - skipping client generation",
      );
      expect(result.warnings).toContain(
        "No operations found in spec - skipping server generation",
      );
    });

    it("should validate against schema", () => {
      const result = generateCodeFromSpec(mockSpec);
      const parsed = CodegenResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("formatCodegenResult", () => {
    const mockResult = {
      specTitle: "Test API",
      specFormat: "typespec",
      types: {
        types: "export type User = { id: string; };",
        typeNames: ["User", "Status"],
        enums: ["Status"],
      },
      client: {
        code: "export class TestClient {}",
        className: "TestClient",
        methods: ["getUser", "createUser"],
        dependencies: ["fetch"],
      },
      server: {
        code: "const app = new Hono();",
        routes: [
          { method: "GET", path: "/users", handler: "listUsers" },
          { method: "POST", path: "/users", handler: "createUser" },
        ],
        framework: "hono",
        dependencies: ["hono"],
      },
      generatedAt: "2024-01-01T00:00:00.000Z",
      warnings: [],
    };

    it("should format result as markdown", () => {
      const formatted = formatCodegenResult(mockResult);

      expect(formatted).toContain("# Code Generation: Test API");
      expect(formatted).toContain("**Source Format:** typespec");
    });

    it("should include types summary", () => {
      const formatted = formatCodegenResult(mockResult);

      expect(formatted).toContain("## Generated Types");
      expect(formatted).toContain("- **Types:** 2");
      expect(formatted).toContain("- **Enums:** 1");
      expect(formatted).toContain("`User`");
      expect(formatted).toContain("`Status` (enum)");
    });

    it("should include client summary", () => {
      const formatted = formatCodegenResult(mockResult);

      expect(formatted).toContain("## Generated Client");
      expect(formatted).toContain("- **Class:** `TestClient`");
      expect(formatted).toContain("- **Methods:** 2");
      expect(formatted).toContain("`getUser()`");
      expect(formatted).toContain("`createUser()`");
    });

    it("should include server summary", () => {
      const formatted = formatCodegenResult(mockResult);

      expect(formatted).toContain("## Generated Server");
      expect(formatted).toContain("- **Framework:** hono");
      expect(formatted).toContain("- **Routes:** 2");
      expect(formatted).toContain("| GET | `/users` |");
    });

    it("should include warnings when present", () => {
      const resultWithWarnings = {
        ...mockResult,
        warnings: ["No operations found"],
      };

      const formatted = formatCodegenResult(resultWithWarnings);

      expect(formatted).toContain("## Warnings");
      expect(formatted).toContain("- No operations found");
    });

    it("should omit warnings section when empty", () => {
      const formatted = formatCodegenResult(mockResult);

      expect(formatted).not.toContain("## Warnings");
    });
  });

  describe("edge cases", () => {
    it("should handle empty spec", () => {
      const emptySpec: ParsedSpec = {
        format: "unknown",
        title: "Empty",
        servers: [],
        operations: [],
        models: [],
        namespaces: [],
        imports: [],
        rawContent: "",
      };

      const result = generateCodeFromSpec(emptySpec);

      expect(result.types.typeNames).toHaveLength(0);
      expect(result.client).toBeUndefined();
      expect(result.server).toBeUndefined();
    });

    it("should handle model with no properties", () => {
      const model: ModelDefinition = {
        name: "Empty",
        properties: [],
        isEnum: false,
      };

      const result = generateTypeFromModel(model);

      expect(result).toContain("export type Empty = {");
      expect(result).toContain("};");
    });

    it("should handle operation with query parameters", () => {
      const spec: ParsedSpec = {
        format: "openapi",
        title: "Query API",
        servers: [],
        operations: [
          {
            operationId: "search",
            method: "get",
            path: "/search",
            parameters: [
              { name: "q", in: "query", type: "string", required: true },
              { name: "limit", in: "query", type: "int32", required: false },
            ],
            responses: [{ statusCode: 200 }],
            tags: [],
          },
        ],
        models: [],
        namespaces: [],
        imports: [],
        rawContent: "",
      };

      const result = generateClientFromSpec(spec);

      expect(result.code).toContain("query?: {");
      expect(result.code).toContain("q: string");
      expect(result.code).toContain("limit?: number");
      expect(result.code).toContain("URLSearchParams");
    });

    it("should convert path params from {param} to :param for servers", () => {
      const spec: ParsedSpec = {
        format: "openapi",
        title: "Path API",
        servers: [],
        operations: [
          {
            operationId: "getItem",
            method: "get",
            path: "/items/{itemId}/details/{detailId}",
            parameters: [
              { name: "itemId", in: "path", type: "string", required: true },
              { name: "detailId", in: "path", type: "string", required: true },
            ],
            responses: [{ statusCode: 200 }],
            tags: [],
          },
        ],
        models: [],
        namespaces: [],
        imports: [],
        rawContent: "",
      };

      const result = generateServerFromSpec(spec);

      expect(result.routes[0]?.path).toBe("/items/:itemId/details/:detailId");
    });
  });
});
