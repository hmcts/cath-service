import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { listTypeData } from "@hmcts/list-types-common/list-type-data";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { buildPublisherDocument, type OpenApiDocument } from "./publisher-document.js";
import { PUBLISHER_DOCUMENT_PATH, REPO_ROOT, readPublisherInputs } from "./publisher-inputs.js";

const REGENERATE_MESSAGE = `Run yarn openapi:publisher and commit ${PUBLISHER_DOCUMENT_PATH}`;
const OPERATION_POLICIES_PATH = "infrastructure/resources/operation-policies";

const committed = JSON.parse(readFileSync(path.join(REPO_ROOT, PUBLISHER_DOCUMENT_PATH), "utf-8")) as OpenApiDocument;
const inputs = readPublisherInputs(REPO_ROOT);

describe("committed publisher document", () => {
  it("should equal the generator output for docs/api/openapi.yaml and listTypeData", () => {
    // Act
    const generated = buildPublisherDocument(readPublisherInputs(REPO_ROOT));

    // Assert
    expect(committed, REGENERATE_MESSAGE).toEqual(generated);
  });

  describe("x-list-type enum", () => {
    const listTypeNames = listTypeData.map((listType) => listType.name);
    const enumValues = (committed.components?.parameters?.ListType.schema?.enum ?? []) as string[];

    it("should contain every list type in listTypeData", () => {
      // Act
      const missing = listTypeNames.filter((name) => !enumValues.includes(name));

      // Assert
      expect(missing, `${REGENERATE_MESSAGE}: list types missing from the enum`).toEqual([]);
    });

    it("should contain no list type absent from listTypeData", () => {
      // Act
      const extra = enumValues.filter((name) => !listTypeNames.includes(name));

      // Assert
      expect(extra, `${REGENERATE_MESSAGE}: enum values not in listTypeData`).toEqual([]);
    });

    it("should be sorted", () => {
      // Assert
      expect(enumValues).toEqual([...enumValues].sort((a, b) => a.localeCompare(b, "en")));
    });
  });

  describe("exposure", () => {
    it("should contain exactly the operations in apim-operations.json, with their APIM operationIds", () => {
      // Act
      const exposed = Object.fromEntries(
        Object.entries(committed.paths).map(([pathName, methods]) => [
          pathName,
          Object.fromEntries(Object.entries(methods).map(([method, operation]) => [method, operation.operationId]))
        ])
      );

      // Assert
      expect(exposed).toEqual(inputs.apimOperations);
    });

    it("should name every operation policy file after an operationId in the document", () => {
      // Arrange
      const operationIds = Object.values(committed.paths).flatMap((methods) => Object.values(methods).map((operation) => operation.operationId));

      // Act
      const policyNames = readdirSync(path.join(REPO_ROOT, OPERATION_POLICIES_PATH))
        .filter((fileName) => fileName.endsWith(".xml"))
        .map((fileName) => fileName.replace(/\.xml$/, ""));

      // Assert
      expect(policyNames.length).toBeGreaterThan(0);
      expect(policyNames.filter((name) => !operationIds.includes(name))).toEqual([]);
    });
  });

  describe("integrity", () => {
    it("should resolve every $ref", () => {
      // Act
      const unresolved = collectRefs(committed).filter((ref) => resolveRef(committed, ref) === undefined);

      // Assert
      expect(unresolved).toEqual([]);
    });

    it("should contain no component unreachable from paths or security", () => {
      // Arrange
      const reachable = collectReachable(committed);

      // Act
      const unreachable = Object.entries(committed.components ?? {}).flatMap(([section, entries]) =>
        Object.keys(entries)
          .map((name) => `#/components/${section}/${name}`)
          .filter((ref) => !reachable.has(ref))
      );

      // Assert
      expect(unreachable).toEqual([]);
    });
  });

  describe("publisher contract", () => {
    it("should use only bearerAuth, applied at document level with no operation overrides", () => {
      // Act
      const operations = Object.values(committed.paths).flatMap((methods) => Object.values(methods));

      // Assert
      expect(Object.keys(committed.components?.securitySchemes ?? {})).toEqual(["bearerAuth"]);
      expect(committed.components?.securitySchemes?.bearerAuth).toMatchObject({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: expect.stringContaining("api.publisher.user")
      });
      expect(committed.security).toEqual([{ bearerAuth: [] }]);
      expect(operations.filter((operation) => "security" in operation)).toEqual([]);
    });

    it("should carry the publisher identity and the source version", () => {
      // Assert
      expect(committed.info.title).toBe("CaTH Inbound Publication API");
      expect(committed.info.contact).toEqual({ name: "Court and Tribunal Hearings team", email: "publicationinformation@hmcts.net" });
      expect(committed.info.version).toBe(inputs.source.info.version);
    });

    it("should list only the APIM gateway server", () => {
      // Assert
      expect(committed.servers).toEqual([
        expect.objectContaining({
          url: "https://cft-api-mgmt.{environment}.platform.hmcts.net/cath",
          variables: { environment: { default: "aat", enum: ["aat", "demo", "perftest"] } }
        })
      ]);
    });

    it("should keep the Artefact response as the service returns it", () => {
      // Act
      const artefact = committed.components?.schemas?.Artefact as { properties: Record<string, unknown> } | undefined;
      const properties = artefact?.properties;

      // Assert
      expect(properties).toHaveProperty("locationId");
      expect(properties).not.toHaveProperty("courtId");
      expect(properties).not.toHaveProperty("search");
    });
  });

  describe("internal reference document", () => {
    it("should keep the internal security schemes and routes in docs/api/openapi.yaml", () => {
      // Arrange
      const source = parse(readFileSync(path.join(REPO_ROOT, "docs/api/openapi.yaml"), "utf-8")) as OpenApiDocument;

      // Assert
      expect(Object.keys(source.components?.securitySchemes ?? {})).toEqual(expect.arrayContaining(["azureAd", "session"]));
      expect(Object.keys(source.paths)).toEqual(
        expect.arrayContaining([
          "/v1/publication",
          "/locations",
          "/api/flat-file/{artefactId}/download",
          "/pdf/{artefactId}/download",
          "/health",
          "/health/liveness",
          "/health/readiness"
        ])
      );
    });
  });
});

function collectRefs(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectRefs);
  }

  if (node === null || typeof node !== "object") {
    return [];
  }

  return Object.entries(node).flatMap(([key, value]) => (key === "$ref" && typeof value === "string" ? [value] : collectRefs(value)));
}

function resolveRef(document: OpenApiDocument, ref: string): unknown {
  const [, section, name] = /^#\/components\/([^/]+)\/([^/]+)$/.exec(ref) ?? [];
  return section ? document.components?.[section]?.[name] : undefined;
}

function collectReachable(document: OpenApiDocument): Set<string> {
  const reachable = new Set((document.security ?? []).flatMap((requirement) => Object.keys(requirement).map((name) => `#/components/securitySchemes/${name}`)));
  const pending = collectRefs(document.paths);

  while (pending.length > 0) {
    const ref = pending.pop()!;
    if (!reachable.has(ref)) {
      reachable.add(ref);
      pending.push(...collectRefs(resolveRef(document, ref)));
    }
  }

  return reachable;
}
