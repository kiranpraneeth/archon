/**
 * Tests for the Spec Parser
 */

import { describe, it, expect } from "vitest";
import {
  detectSpecFormat,
  parseTypeSpec,
  parseOpenApi,
  parseSpec,
  SpecFormat,
  HttpMethod,
  ApiParameterSchema,
  ApiResponseSchema,
  ApiOperationSchema,
  ModelDefinitionSchema,
  ParsedSpecSchema,
  type ApiParameter,
  type ApiResponse,
  type ApiOperation,
  type ModelDefinition,
  type ParsedSpec,
} from "./spec-parser.js";

describe("Spec Parser", () => {
  describe("SpecFormat constants", () => {
    it("should have correct format values", () => {
      expect(SpecFormat.TYPESPEC).toBe("typespec");
      expect(SpecFormat.OPENAPI).toBe("openapi");
      expect(SpecFormat.PRD).toBe("prd");
      expect(SpecFormat.UNKNOWN).toBe("unknown");
    });
  });

  describe("HttpMethod constants", () => {
    it("should have correct method values", () => {
      expect(HttpMethod.GET).toBe("get");
      expect(HttpMethod.POST).toBe("post");
      expect(HttpMethod.PUT).toBe("put");
      expect(HttpMethod.PATCH).toBe("patch");
      expect(HttpMethod.DELETE).toBe("delete");
    });
  });

  describe("detectSpecFormat", () => {
    it("should detect TypeSpec by file extension", () => {
      expect(detectSpecFormat("content", "main.tsp")).toBe(SpecFormat.TYPESPEC);
      expect(detectSpecFormat("content", "api.tsp")).toBe(SpecFormat.TYPESPEC);
    });

    it("should detect OpenAPI YAML by extension and content", () => {
      expect(detectSpecFormat("openapi: 3.0.0", "api.yaml")).toBe(
        SpecFormat.OPENAPI,
      );
      expect(detectSpecFormat("swagger: 2.0", "api.yml")).toBe(
        SpecFormat.OPENAPI,
      );
    });

    it("should detect OpenAPI JSON by extension and content", () => {
      expect(detectSpecFormat('{"openapi": "3.0.0"}', "api.json")).toBe(
        SpecFormat.OPENAPI,
      );
      expect(detectSpecFormat('{"swagger": "2.0"}', "api.json")).toBe(
        SpecFormat.OPENAPI,
      );
    });

    it("should detect PRD by file extension", () => {
      expect(detectSpecFormat("# PRD", "requirements.md")).toBe(SpecFormat.PRD);
    });

    it("should detect TypeSpec by content when no extension", () => {
      expect(detectSpecFormat('import "@typespec/http";')).toBe(
        SpecFormat.TYPESPEC,
      );
      expect(detectSpecFormat("using TypeSpec.Http;")).toBe(
        SpecFormat.TYPESPEC,
      );
      expect(detectSpecFormat("@service({ title: 'API' })")).toBe(
        SpecFormat.TYPESPEC,
      );
      expect(detectSpecFormat("namespace Api;\nmodel User {}")).toBe(
        SpecFormat.TYPESPEC,
      );
    });

    it("should detect OpenAPI by content when no extension", () => {
      expect(detectSpecFormat("openapi: 3.0.0\ninfo:")).toBe(
        SpecFormat.OPENAPI,
      );
      expect(detectSpecFormat('{"openapi": "3.0.0"}')).toBe(SpecFormat.OPENAPI);
      expect(detectSpecFormat("swagger: 2.0")).toBe(SpecFormat.OPENAPI);
    });

    it("should detect PRD by content indicators", () => {
      expect(detectSpecFormat("# Feature PRD\n\n## Requirements")).toBe(
        SpecFormat.PRD,
      );
      expect(detectSpecFormat("# PRD\n\n## User Stories")).toBe(SpecFormat.PRD);
      expect(detectSpecFormat("# Spec\n\n## Features")).toBe(SpecFormat.PRD);
      expect(detectSpecFormat("# Doc\n\n## Acceptance Criteria")).toBe(
        SpecFormat.PRD,
      );
      expect(detectSpecFormat("# PRD\n\nFR-001: Feature")).toBe(SpecFormat.PRD);
      expect(detectSpecFormat("# PRD\n\nNFR-001: Performance")).toBe(
        SpecFormat.PRD,
      );
    });

    it("should return unknown for unrecognized content", () => {
      expect(detectSpecFormat("random text")).toBe(SpecFormat.UNKNOWN);
      expect(detectSpecFormat("function test() {}")).toBe(SpecFormat.UNKNOWN);
      expect(detectSpecFormat("")).toBe(SpecFormat.UNKNOWN);
    });
  });

  describe("parseTypeSpec", () => {
    it("should parse basic TypeSpec with service decorator", () => {
      const content = `
import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;

@service({
  title: "Test API",
})
@server("https://api.test.com", "Production server")
namespace TestApi;
`;

      const result = parseTypeSpec(content);

      expect(result.format).toBe(SpecFormat.TYPESPEC);
      expect(result.title).toBe("Test API");
      expect(result.namespaces).toContain("TestApi");
      expect(result.imports).toContain("@typespec/http");
      expect(result.imports).toContain("@typespec/rest");
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]?.url).toBe("https://api.test.com");
      expect(result.servers[0]?.description).toBe("Production server");
    });

    it("should parse enums", () => {
      const content = `
namespace Api;

enum Status {
  active,
  inactive,
  pending,
}
`;

      const result = parseTypeSpec(content);

      expect(result.models).toHaveLength(1);
      expect(result.models[0]?.name).toBe("Status");
      expect(result.models[0]?.isEnum).toBe(true);
      expect(result.models[0]?.enumValues).toContain("active");
      expect(result.models[0]?.enumValues).toContain("inactive");
      expect(result.models[0]?.enumValues).toContain("pending");
    });

    it("should parse models with properties", () => {
      const content = `
namespace Api;

model User {
  id: string;
  name: string;
  email?: string;
  age: int32;
}
`;

      const result = parseTypeSpec(content);

      expect(result.models).toHaveLength(1);
      expect(result.models[0]?.name).toBe("User");
      expect(result.models[0]?.isEnum).toBe(false);
      expect(result.models[0]?.properties).toHaveLength(4);

      const model = result.models[0];
      const idProp = model?.properties.find((p) => p.name === "id");
      expect(idProp?.type).toBe("string");
      expect(idProp?.required).toBe(true);

      const emailProp = model?.properties.find((p) => p.name === "email");
      expect(emailProp?.required).toBe(false);
    });

    it("should parse multiple servers", () => {
      const content = `
@server("https://api.prod.com", "Production")
@server("http://localhost:3000", "Development")
namespace Api;
`;

      const result = parseTypeSpec(content);

      expect(result.servers).toHaveLength(2);
      expect(result.servers[0]?.url).toBe("https://api.prod.com");
      expect(result.servers[1]?.url).toBe("http://localhost:3000");
    });

    it("should parse routes and operations", () => {
      const content = `
namespace Users;

@route("/users")
@get
op listUsers(): User[];

@route("/users/{id}")
@get
op getUser(@path id: string): User;

@route("/users")
@post
op createUser(@body user: User): User;
`;

      const result = parseTypeSpec(content);

      expect(result.operations).toHaveLength(3);

      const listOp = result.operations.find(
        (o) => o.operationId === "listUsers",
      );
      expect(listOp?.method).toBe("get");
      expect(listOp?.path).toBe("/users");

      const getOp = result.operations.find((o) => o.operationId === "getUser");
      expect(getOp?.method).toBe("get");
      expect(getOp?.path).toBe("/users/{id}");

      const createOp = result.operations.find(
        (o) => o.operationId === "createUser",
      );
      expect(createOp?.method).toBe("post");
      expect(createOp?.path).toBe("/users");
    });

    it("should handle empty content", () => {
      const result = parseTypeSpec("");

      expect(result.format).toBe(SpecFormat.TYPESPEC);
      expect(result.title).toBe("Untitled API");
      expect(result.models).toHaveLength(0);
      expect(result.operations).toHaveLength(0);
    });

    it("should parse description from doc comments", () => {
      const content = `
/**
 * This is a test API for demonstration purposes.
 */
namespace TestApi;
`;

      const result = parseTypeSpec(content);

      expect(result.description).toContain("This is a test API");
    });
  });

  describe("parseOpenApi", () => {
    it("should parse JSON OpenAPI spec", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
          description: "A test API",
        },
        servers: [
          { url: "https://api.test.com", description: "Production" },
          { url: "http://localhost:3000", description: "Development" },
        ],
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              summary: "List all users",
              responses: {
                200: { description: "Success" },
              },
            },
          },
        },
      });

      const result = parseOpenApi(content);

      expect(result.format).toBe(SpecFormat.OPENAPI);
      expect(result.title).toBe("Test API");
      expect(result.version).toBe("1.0.0");
      expect(result.description).toBe("A test API");
      expect(result.servers).toHaveLength(2);
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.operationId).toBe("listUsers");
    });

    it("should parse operations with parameters", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "API" },
        paths: {
          "/users/{id}": {
            get: {
              operationId: "getUser",
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
                {
                  name: "fields",
                  in: "query",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              responses: {
                200: { description: "Success" },
              },
            },
          },
        },
      });

      const result = parseOpenApi(content);

      expect(result.operations).toHaveLength(1);
      const op = result.operations[0];
      expect(op?.parameters).toHaveLength(2);
      expect(op?.parameters[0]?.name).toBe("id");
      expect(op?.parameters[0]?.in).toBe("path");
      expect(op?.parameters[0]?.required).toBe(true);
    });

    it("should parse schemas/components", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "API" },
        components: {
          schemas: {
            User: {
              description: "A user object",
              properties: {
                id: { type: "string" },
                name: { type: "string", description: "User name" },
              },
              required: ["id"],
            },
            Status: {
              enum: ["active", "inactive"],
            },
          },
        },
      });

      const result = parseOpenApi(content);

      expect(result.models).toHaveLength(2);

      const userModel = result.models.find((m) => m.name === "User");
      expect(userModel?.description).toBe("A user object");
      expect(userModel?.isEnum).toBe(false);
      expect(userModel?.properties).toHaveLength(2);

      const statusModel = result.models.find((m) => m.name === "Status");
      expect(statusModel?.isEnum).toBe(true);
      expect(statusModel?.enumValues).toContain("active");
    });

    it("should parse YAML-style content", () => {
      const content = `
openapi: 3.0.0
info:
  title: 'Test API'
  version: '1.0.0'
  description: 'YAML API'
servers:
  - url: 'https://api.test.com'
`;

      const result = parseOpenApi(content);

      expect(result.format).toBe(SpecFormat.OPENAPI);
      expect(result.title).toBe("Test API");
      expect(result.version).toBe("1.0.0");
      expect(result.description).toBe("YAML API");
      expect(result.servers).toHaveLength(1);
    });

    it("should handle invalid JSON gracefully", () => {
      const result = parseOpenApi("invalid json {");

      expect(result.format).toBe(SpecFormat.OPENAPI);
      expect(result.title).toBe("Untitled API");
    });

    it("should handle Swagger 2.0 definitions", () => {
      const content = JSON.stringify({
        swagger: "2.0",
        info: { title: "Legacy API" },
        definitions: {
          User: {
            properties: {
              id: { type: "integer" },
            },
          },
        },
      });

      const result = parseOpenApi(content);

      expect(result.models).toHaveLength(1);
      expect(result.models[0]?.name).toBe("User");
    });
  });

  describe("parseSpec", () => {
    it("should route to parseTypeSpec for TypeSpec content", () => {
      const content = 'import "@typespec/http";\nnamespace Api;';

      const result = parseSpec(content);

      expect(result.format).toBe(SpecFormat.TYPESPEC);
    });

    it("should route to parseOpenApi for OpenAPI content", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "API" },
      });

      const result = parseSpec(content);

      expect(result.format).toBe(SpecFormat.OPENAPI);
    });

    it("should return PRD format for markdown PRD content", () => {
      const content = "# Feature PRD\n\n## Requirements\n\n- FR-001";

      const result = parseSpec(content);

      expect(result.format).toBe(SpecFormat.PRD);
      expect(result.title).toBe("PRD Document");
    });

    it("should return unknown for unrecognized content", () => {
      const content = "random unrecognized content";

      const result = parseSpec(content);

      expect(result.format).toBe(SpecFormat.UNKNOWN);
    });

    it("should use filename for format detection", () => {
      const result = parseSpec("content", "api.tsp");

      expect(result.format).toBe(SpecFormat.TYPESPEC);
    });
  });

  describe("Zod Schemas", () => {
    describe("ApiParameterSchema", () => {
      it("should validate a valid parameter", () => {
        const param: ApiParameter = {
          name: "id",
          in: "path",
          type: "string",
          required: true,
          description: "User ID",
        };

        const result = ApiParameterSchema.safeParse(param);
        expect(result.success).toBe(true);
      });

      it("should reject invalid 'in' value", () => {
        const param = {
          name: "id",
          in: "invalid",
          type: "string",
          required: true,
        };

        const result = ApiParameterSchema.safeParse(param);
        expect(result.success).toBe(false);
      });
    });

    describe("ApiResponseSchema", () => {
      it("should validate a valid response", () => {
        const response: ApiResponse = {
          statusCode: 200,
          description: "Success",
          schema: "User",
        };

        const result = ApiResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    describe("ApiOperationSchema", () => {
      it("should validate a valid operation", () => {
        const operation: ApiOperation = {
          operationId: "getUser",
          method: "get",
          path: "/users/{id}",
          summary: "Get user",
          parameters: [
            { name: "id", in: "path", type: "string", required: true },
          ],
          responses: [{ statusCode: 200, description: "Success" }],
          tags: ["Users"],
        };

        const result = ApiOperationSchema.safeParse(operation);
        expect(result.success).toBe(true);
      });

      it("should reject invalid method", () => {
        const operation = {
          operationId: "test",
          method: "invalid",
          path: "/test",
          parameters: [],
          responses: [],
          tags: [],
        };

        const result = ApiOperationSchema.safeParse(operation);
        expect(result.success).toBe(false);
      });
    });

    describe("ModelDefinitionSchema", () => {
      it("should validate a model definition", () => {
        const model: ModelDefinition = {
          name: "User",
          description: "A user",
          properties: [
            { name: "id", type: "string", required: true },
            {
              name: "email",
              type: "string",
              required: false,
              description: "Email",
            },
          ],
          isEnum: false,
        };

        const result = ModelDefinitionSchema.safeParse(model);
        expect(result.success).toBe(true);
      });

      it("should validate an enum definition", () => {
        const model: ModelDefinition = {
          name: "Status",
          properties: [],
          isEnum: true,
          enumValues: ["active", "inactive"],
        };

        const result = ModelDefinitionSchema.safeParse(model);
        expect(result.success).toBe(true);
      });
    });

    describe("ParsedSpecSchema", () => {
      it("should validate a complete parsed spec", () => {
        const spec: ParsedSpec = {
          format: "typespec",
          title: "Test API",
          version: "1.0.0",
          description: "A test API",
          servers: [{ url: "https://api.test.com", description: "Prod" }],
          operations: [],
          models: [],
          namespaces: ["Api"],
          imports: ["@typespec/http"],
          rawContent: "content",
        };

        const result = ParsedSpecSchema.safeParse(spec);
        expect(result.success).toBe(true);
      });

      it("should reject invalid format", () => {
        const spec = {
          format: "invalid",
          title: "Test",
          servers: [],
          operations: [],
          models: [],
          namespaces: [],
          imports: [],
          rawContent: "",
        };

        const result = ParsedSpecSchema.safeParse(spec);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle TypeSpec with multiple namespaces", () => {
      const content = `
namespace Users;
model User {}

namespace Products;
model Product {}
`;

      const result = parseTypeSpec(content);

      expect(result.namespaces).toContain("Users");
      expect(result.namespaces).toContain("Products");
      expect(result.models).toHaveLength(2);
    });

    it("should handle models with complex types", () => {
      const content = `
namespace Api;

model Response {
  data: User[];
  meta?: Record<string>;
}
`;

      const result = parseTypeSpec(content);

      expect(result.models).toHaveLength(1);
      expect(result.models[0]?.properties).toHaveLength(2);
    });

    it("should handle empty OpenAPI paths", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Empty API" },
        paths: {},
      });

      const result = parseOpenApi(content);

      expect(result.operations).toHaveLength(0);
    });

    it("should handle OpenAPI without servers", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "No Servers" },
      });

      const result = parseOpenApi(content);

      expect(result.servers).toHaveLength(0);
    });
  });
});
