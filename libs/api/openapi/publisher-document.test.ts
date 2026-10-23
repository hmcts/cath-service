import { describe, expect, it } from "vitest";
import { buildPublisherDocument, type ListTypeSchemas, type OpenApiDocument, type PublisherInputs } from "./publisher-document.js";

const APIM_OPERATIONS = { "/": { get: "healthCheck" }, "/publication": { post: "createPublication" } };

const LIST_TYPES: ListTypeSchemas[] = [
  { name: "ZETA_LIST", schemaPaths: [] },
  { name: "ALPHA_LIST", schemaPaths: ["libs/list-types/alpha-list/src/schemas/alpha-list.json"] },
  {
    name: "MULTI_LIST",
    schemaPaths: ["libs/list-types/multi-list/src/schemas/a.json", "libs/list-types/multi-list/src/schemas/b.json"]
  }
];

function buildSource(): OpenApiDocument {
  return {
    openapi: "3.0.3",
    info: { title: "Internal API", version: "9.9.9", description: "Internal", license: { name: "MIT" } },
    servers: [{ url: "http://localhost:3001" }],
    tags: [
      { name: "Publication", description: "Ingestion." },
      { name: "Service", description: "Metadata." },
      { name: "Locations", description: "Reference data." }
    ],
    paths: {
      "/": {
        get: { tags: ["Service"], operationId: "getServiceInfo", security: [], responses: { "200": { description: "OK" } } }
      },
      "/publication": {
        post: {
          tags: ["Publication"],
          operationId: "createPublicationAtRoot",
          security: [{ azureAd: [] }],
          parameters: [{ $ref: "#/components/parameters/ListType" }, { $ref: "#/components/parameters/Provenance" }],
          responses: { "201": { $ref: "#/components/responses/Created" } }
        }
      },
      "/locations": {
        get: {
          tags: ["Locations"],
          operationId: "getLocations",
          responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Location" } } } } }
        }
      }
    },
    components: {
      securitySchemes: { azureAd: { type: "oauth2" }, session: { type: "apiKey" } },
      parameters: {
        ListType: { name: "x-list-type", in: "header", description: "Internal description", schema: { type: "string" }, example: "ALPHA_LIST" },
        Provenance: { name: "x-provenance", in: "header", schema: { type: "string" } },
        ArtefactId: { name: "artefactId", in: "path", schema: { type: "string" } }
      },
      responses: {
        Created: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Artefact" } } } },
        Unused: { description: "Unused" }
      },
      headers: { NoStore: { schema: { type: "string" } } },
      schemas: {
        Artefact: { type: "object", properties: { message: { $ref: "#/components/schemas/Message" } } },
        Message: { type: "object" },
        Location: { type: "object" }
      }
    },
    "x-publisher": {
      info: { title: "Publisher API", description: "For publishers", contact: { name: "Team", email: "team@example.com" } },
      servers: [{ url: "https://gateway.example.com/cath" }],
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      listTypeDescription: "List type name.\n",
      schemaBaseUrl: "https://example.com/blob/master/"
    }
  };
}

function buildInputs(overrides: Partial<PublisherInputs> = {}): PublisherInputs {
  return { source: buildSource(), apimOperations: APIM_OPERATIONS, listTypes: LIST_TYPES, ...overrides };
}

describe("buildPublisherDocument", () => {
  describe("operations", () => {
    it("should include only the APIM operations, renamed to the APIM operationIds", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(Object.keys(document.paths)).toEqual(["/", "/publication"]);
      expect(document.paths["/"].get.operationId).toBe("healthCheck");
      expect(document.paths["/publication"].post.operationId).toBe("createPublication");
    });

    it("should apply bearerAuth at document level and drop operation-level security, including GET / security: []", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.security).toEqual([{ bearerAuth: [] }]);
      expect(document.paths["/"].get).not.toHaveProperty("security");
      expect(document.paths["/publication"].post).not.toHaveProperty("security");
    });

    it("should add the APIM operationId when the source operation has none", () => {
      // Arrange
      const source = buildSource();
      delete source.paths["/"].get.operationId;

      // Act
      const document = buildPublisherDocument(buildInputs({ source }));

      // Assert
      expect(document.paths["/"].get.operationId).toBe("healthCheck");
    });

    it("should not modify the source document", () => {
      // Arrange
      const source = buildSource();
      const original = structuredClone(source);

      // Act
      buildPublisherDocument(buildInputs({ source }));

      // Assert
      expect(source).toEqual(original);
    });
  });

  describe("publisher overrides", () => {
    it("should merge x-publisher info over the source info, keeping version and license", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.info).toEqual({
        title: "Publisher API",
        version: "9.9.9",
        description: "For publishers",
        license: { name: "MIT" },
        contact: { name: "Team", email: "team@example.com" }
      });
    });

    it("should replace servers and security schemes and remove x-publisher", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.servers).toEqual([{ url: "https://gateway.example.com/cath" }]);
      expect(document.components?.securitySchemes).toEqual({ bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } });
      expect(document).not.toHaveProperty("x-publisher");
    });

    it("should emit top-level keys in a fixed order", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(Object.keys(document)).toEqual(["openapi", "info", "servers", "tags", "security", "paths", "components"]);
    });
  });

  describe("x-list-type", () => {
    it("should enumerate list type names sorted and de-duplicated", () => {
      // Arrange
      const listTypes = [...LIST_TYPES, { name: "ALPHA_LIST", schemaPaths: LIST_TYPES[1].schemaPaths }];

      // Act
      const document = buildPublisherDocument(buildInputs({ listTypes }));

      // Assert
      expect(document.components?.parameters?.ListType.schema?.enum).toEqual(["ALPHA_LIST", "MULTI_LIST", "ZETA_LIST"]);
    });

    it("should include a new list type without any change to the source document", () => {
      // Arrange
      const listTypes = [...LIST_TYPES, { name: "BRAND_NEW_LIST", schemaPaths: [] }];

      // Act
      const document = buildPublisherDocument(buildInputs({ listTypes }));

      // Assert
      expect(document.components?.parameters?.ListType.schema?.enum).toContain("BRAND_NEW_LIST");
    });

    it("should describe the preamble followed by schema links only for list types with schemas", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.components?.parameters?.ListType.description).toBe(
        [
          "List type name.",
          "",
          "- `ALPHA_LIST`: [alpha-list.json](https://example.com/blob/master/libs/list-types/alpha-list/src/schemas/alpha-list.json)",
          "- `MULTI_LIST`: [a.json](https://example.com/blob/master/libs/list-types/multi-list/src/schemas/a.json), [b.json](https://example.com/blob/master/libs/list-types/multi-list/src/schemas/b.json)",
          ""
        ].join("\n")
      );
    });

    it("should describe only the preamble when no list type has a schema", () => {
      // Arrange
      const listTypes = [{ name: "FLAT_ONLY", schemaPaths: [] }];

      // Act
      const document = buildPublisherDocument(buildInputs({ listTypes }));

      // Assert
      expect(document.components?.parameters?.ListType.description).toBe("List type name.\n");
    });

    it("should keep the remaining ListType properties from the source", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.components?.parameters?.ListType).toMatchObject({ name: "x-list-type", in: "header", example: "ALPHA_LIST", schema: { type: "string" } });
    });
  });

  describe("pruning", () => {
    it("should keep only components reachable from the exposed operations, following refs transitively", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.components).toEqual({
        securitySchemes: { bearerAuth: expect.any(Object) },
        parameters: { ListType: expect.any(Object), Provenance: expect.any(Object) },
        responses: { Created: expect.any(Object) },
        schemas: { Artefact: expect.any(Object), Message: expect.any(Object) }
      });
    });

    it("should keep only tags used by the exposed operations", () => {
      // Arrange
      const inputs = buildInputs();

      // Act
      const document = buildPublisherDocument(inputs);

      // Assert
      expect(document.tags?.map((tag) => tag.name)).toEqual(["Publication", "Service"]);
    });
  });

  describe("errors", () => {
    it("should throw when x-publisher is missing", () => {
      // Arrange
      const source = buildSource();
      delete source["x-publisher"];

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ source }))).toThrow("docs/api/openapi.yaml has no x-publisher");
    });

    it("should throw naming the missing x-publisher key", () => {
      // Arrange
      const source = buildSource();
      delete (source["x-publisher"] as Partial<NonNullable<OpenApiDocument["x-publisher"]>>).schemaBaseUrl;

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ source }))).toThrow("docs/api/openapi.yaml has no x-publisher.schemaBaseUrl");
    });

    it("should throw when an APIM operation is absent from the source", () => {
      // Arrange
      const apimOperations = { ...APIM_OPERATIONS, "/foo": { post: "createFoo" } };

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ apimOperations }))).toThrow(
        "apim-operations.json exposes POST /foo but docs/api/openapi.yaml has no such operation"
      );
    });

    it("should throw when two APIM operations share an operationId", () => {
      // Arrange
      const apimOperations = { "/": { get: "createPublication" }, "/publication": { post: "createPublication" } };

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ apimOperations }))).toThrow("assigns operationId createPublication to more than one operation");
    });

    it("should throw naming a dangling $ref", () => {
      // Arrange
      const source = buildSource();
      delete source.components?.schemas?.Message;

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ source }))).toThrow("Unresolved $ref #/components/schemas/Message");
    });

    it("should throw when the ListType component is absent", () => {
      // Arrange
      const source = buildSource();
      delete source.components?.parameters?.ListType;

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ source }))).toThrow("docs/api/openapi.yaml has no #/components/parameters/ListType");
    });

    it("should throw when x-list-type is declared inline", () => {
      // Arrange
      const source = buildSource();
      source.paths["/publication"].post.parameters = [{ name: "x-list-type", in: "header", schema: { type: "string" } }];

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ source }))).toThrow("x-list-type must be declared through #/components/parameters/ListType");
    });

    it("should throw when no exposed operation references ListType", () => {
      // Arrange
      const source = buildSource();
      source.paths["/publication"].post.parameters = [{ $ref: "#/components/parameters/Provenance" }];

      // Act & Assert
      expect(() => buildPublisherDocument(buildInputs({ source }))).toThrow("No exposed operation references #/components/parameters/ListType");
    });
  });
});
