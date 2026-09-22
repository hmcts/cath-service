import { ArtefactType } from "@hmcts/publication";
import { describe, expect, it } from "vitest";
import { buildArtefactResponse, buildLcsuArtefactResponse, buildMessage, joinValidationMessages, toSpecLanguage } from "./artefact-response.js";
import type { PublicationMetadata } from "./publication-headers.js";

function metadata(overrides: Partial<PublicationMetadata> = {}): PublicationMetadata {
  return {
    provenance: "SNL",
    courtId: "1",
    contentDate: "2026-09-14T00:00:00.000Z",
    listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    language: "ENGLISH",
    type: ArtefactType.LIST,
    sensitivity: "PUBLIC",
    displayFrom: null,
    displayTo: null,
    sourceArtefactId: null,
    ...overrides
  };
}

describe("toSpecLanguage", () => {
  it("should map BILINGUAL to BI_LINGUAL", () => {
    // Act & Assert
    expect(toSpecLanguage("BILINGUAL")).toBe("BI_LINGUAL");
  });

  it.each([["ENGLISH"], ["WELSH"]])("should pass %s through unchanged", (language) => {
    // Act & Assert
    expect(toSpecLanguage(language)).toBe(language);
  });
});

describe("buildArtefactResponse", () => {
  it("should build the camelCase Artefact body", () => {
    // Act
    const result = buildArtefactResponse({
      metadata: metadata({ displayFrom: "2026-09-14T00:00:00.000Z", displayTo: "2026-09-20T00:00:00.000Z", sourceArtefactId: "src-1" }),
      artefactId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      isFlatFile: false,
      payload: "https://account.blob.core.windows.net/artefact/3fa85f64",
      cases: [{ caseNumber: "T20250001", caseName: "R v Smith" }]
    });

    // Assert
    expect(result).toEqual({
      artefactId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      contentDate: "2026-09-14T00:00:00.000Z",
      displayFrom: "2026-09-14T00:00:00.000Z",
      displayTo: "2026-09-20T00:00:00.000Z",
      isFlatFile: false,
      language: "ENGLISH",
      listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      locationId: "1",
      payload: "https://account.blob.core.windows.net/artefact/3fa85f64",
      provenance: "SNL",
      search: { cases: [{ caseNumber: "T20250001", caseName: "R v Smith" }] },
      sensitivity: "PUBLIC",
      sourceArtefactId: "src-1",
      type: "LIST"
    });
  });

  it("should emit null display dates when the metadata has none", () => {
    // Act
    const result = buildArtefactResponse({ metadata: metadata(), artefactId: "abc", isFlatFile: false });

    // Assert
    expect(result.displayFrom).toBeNull();
    expect(result.displayTo).toBeNull();
  });

  it("should omit search when no cases were extracted", () => {
    // Act
    const result = buildArtefactResponse({ metadata: metadata(), artefactId: "abc", isFlatFile: true, cases: [] });

    // Assert
    expect(result).not.toHaveProperty("search");
  });

  it("should omit payload when no blob url is supplied", () => {
    // Act
    const result = buildArtefactResponse({ metadata: metadata(), artefactId: "abc", isFlatFile: true });

    // Assert
    expect(result).not.toHaveProperty("payload");
  });

  it("should set isFlatFile true for flat file publications", () => {
    // Act
    const result = buildArtefactResponse({ metadata: metadata(), artefactId: "abc", isFlatFile: true });

    // Assert
    expect(result.isFlatFile).toBe(true);
  });

  it("should emit BI_LINGUAL for bilingual publications", () => {
    // Act
    const result = buildArtefactResponse({ metadata: metadata({ language: "BILINGUAL" }), artefactId: "abc", isFlatFile: false });

    // Assert
    expect(result.language).toBe("BI_LINGUAL");
  });

  it("should normalise a date-only content date to an ISO date-time", () => {
    // Act
    const result = buildArtefactResponse({ metadata: metadata({ contentDate: "2026-09-14" }), artefactId: "abc", isFlatFile: false });

    // Assert
    expect(result.contentDate).toBe("2026-09-14T00:00:00.000Z");
  });
});

describe("buildLcsuArtefactResponse", () => {
  it("should return an unpersisted artefact with a blank id, isFlatFile true and no payload or search", () => {
    // Act
    const result = buildLcsuArtefactResponse(metadata({ type: ArtefactType.LCSU }));

    // Assert
    expect(result).toEqual({
      artefactId: "",
      contentDate: "2026-09-14T00:00:00.000Z",
      displayFrom: null,
      displayTo: null,
      isFlatFile: true,
      language: "ENGLISH",
      listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      locationId: "1",
      provenance: "SNL",
      sensitivity: "PUBLIC",
      sourceArtefactId: null,
      type: "LCSU"
    });
  });

  it("should report type LCSU even when the metadata says otherwise", () => {
    // Act
    const result = buildLcsuArtefactResponse(metadata());

    // Assert
    expect(result.type).toBe("LCSU");
  });

  it("should return a null listType when the LCSU request omitted x-list-type", () => {
    // Act
    const result = buildLcsuArtefactResponse(metadata({ type: ArtefactType.LCSU, listType: null }));

    // Assert
    expect(result.listType).toBeNull();
  });
});

describe("buildMessage", () => {
  it("should return the message with an ISO timestamp", () => {
    // Act
    const result = buildMessage("x-court-id is required");

    // Assert
    expect(result.message).toBe("x-court-id is required");
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("joinValidationMessages", () => {
  it("should join the messages with a semicolon", () => {
    // Act
    const result = joinValidationMessages([
      { field: "x-court-id", message: "x-court-id is required" },
      { field: "x-language", message: "x-language must be one of ENGLISH, WELSH" }
    ]);

    // Assert
    expect(result).toBe("x-court-id is required; x-language must be one of ENGLISH, WELSH");
  });

  it("should return an empty string when there are no errors", () => {
    // Act & Assert
    expect(joinValidationMessages([])).toBe("");
  });
});
