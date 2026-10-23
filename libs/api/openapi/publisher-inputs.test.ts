import { existsSync } from "node:fs";
import path from "node:path";
import { listTypeData } from "@hmcts/list-types-common/list-type-data";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, readPublisherInputs } from "./publisher-inputs.js";

describe("readPublisherInputs", () => {
  it("should read the source document and the APIM operations", () => {
    // Act
    const { source, apimOperations } = readPublisherInputs(REPO_ROOT);

    // Assert
    expect(source.openapi).toBe("3.0.3");
    expect(source["x-publisher"]).toBeDefined();
    expect(apimOperations).toEqual({ "/": { get: "healthCheck" }, "/publication": { post: "createPublication" } });
  });

  it("should include every strategic listTypeData entry", () => {
    // Arrange
    const strategicNames = listTypeData.filter((listType) => !listType.isNonStrategic).map((listType) => listType.name);

    // Act
    const { listTypes } = readPublisherInputs(REPO_ROOT);

    // Assert
    expect(listTypes.map((listType) => listType.name)).toEqual(strategicNames);
  });

  it("should exclude non-strategic list types", () => {
    // Arrange
    const nonStrategicNames = listTypeData.filter((listType) => listType.isNonStrategic).map((listType) => listType.name);

    // Act
    const { listTypes } = readPublisherInputs(REPO_ROOT);

    // Assert
    expect(nonStrategicNames).toContain("UTIAC_JR_LEEDS_DAILY_HEARING_LIST");
    expect(listTypes.filter((listType) => nonStrategicNames.includes(listType.name))).toEqual([]);
  });

  it("should resolve an aliased list type to its parent package schema", () => {
    // Act
    const { listTypes } = readPublisherInputs(REPO_ROOT);

    // Assert
    expect(listTypes.find((listType) => listType.name === "CROWN_DAILY_PDDA_LIST")?.schemaPaths).toEqual([
      "libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json"
    ]);
  });

  it("should return no schemas for a flat-file-only list type", () => {
    // Act
    const { listTypes } = readPublisherInputs(REPO_ROOT);

    // Assert
    expect(listTypes.find((listType) => listType.name === "PCOL_DAILY_CAUSE_LIST")?.schemaPaths).toEqual([]);
  });

  it("should only return schema paths that exist as .json files", () => {
    // Act
    const { listTypes } = readPublisherInputs(REPO_ROOT);

    // Assert
    const schemaPaths = listTypes.flatMap((listType) => listType.schemaPaths);
    expect(schemaPaths.length).toBeGreaterThan(0);
    expect(schemaPaths.filter((schemaPath) => !schemaPath.endsWith(".json") || !existsSync(path.join(REPO_ROOT, schemaPath)))).toEqual([]);
  });
});
