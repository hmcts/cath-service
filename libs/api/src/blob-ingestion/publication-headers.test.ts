import type { IncomingHttpHeaders } from "node:http";
import { ArtefactType } from "@hmcts/publication";
import { describe, expect, it } from "vitest";
import { parsePublicationHeaders } from "./publication-headers.js";

function validHeaders(overrides: IncomingHttpHeaders = {}): IncomingHttpHeaders {
  return {
    "x-provenance": "SNL",
    "x-court-id": "1",
    "x-content-date": "2026-09-14T14:00:00.001Z",
    "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    "x-language": "ENGLISH",
    "x-type": "LIST",
    ...overrides
  };
}

describe("parsePublicationHeaders", () => {
  it("should return metadata when all required headers are present", () => {
    // Arrange
    const headers = validHeaders();

    // Act
    const result = parsePublicationHeaders(headers);

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.metadata).toEqual({
      provenance: "SNL",
      courtId: "1",
      contentDate: "2026-09-14T14:00:00.001Z",
      listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      language: "ENGLISH",
      type: ArtefactType.LIST,
      sensitivity: "PUBLIC",
      displayFrom: null,
      displayTo: null,
      sourceArtefactId: null
    });
  });

  it("should default sensitivity to PUBLIC when x-sensitivity is omitted", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders());

    // Assert
    expect(result.metadata?.sensitivity).toBe("PUBLIC");
  });

  it("should keep an explicit sensitivity", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-sensitivity": "CLASSIFIED" }));

    // Assert
    expect(result.metadata?.sensitivity).toBe("CLASSIFIED");
  });

  it("should return null display dates when the optional headers are omitted", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders());

    // Assert
    expect(result.metadata?.displayFrom).toBeNull();
    expect(result.metadata?.displayTo).toBeNull();
  });

  it("should read the display dates when supplied", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-display-from": "2026-09-14T00:00:00.000Z", "x-display-to": "2026-09-20T00:00:00.000Z" }));

    // Assert
    expect(result.metadata?.displayFrom).toBe("2026-09-14T00:00:00.000Z");
    expect(result.metadata?.displayTo).toBe("2026-09-20T00:00:00.000Z");
  });

  it("should read the source artefact id when supplied", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-source-artefact-id": "source-123" }));

    // Assert
    expect(result.metadata?.sourceArtefactId).toBe("source-123");
  });

  it("should resolve x-type LCSU", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-type": "LCSU" }));

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.metadata?.type).toBe(ArtefactType.LCSU);
  });

  // The spec notes x-list-type is "only set when x-type is set to LIST", and the incumbent's
  // functional test uploads an LCSU file without it.
  it("should not require x-list-type for an LCSU request", () => {
    // Arrange
    const headers = validHeaders({ "x-type": "LCSU" });
    delete headers["x-list-type"];

    // Act
    const result = parsePublicationHeaders(headers);

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.metadata?.listType).toBeNull();
  });

  it("should keep x-list-type when an LCSU request supplies it", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-type": "LCSU" }));

    // Assert
    expect(result.metadata?.listType).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
  });

  it("should still require x-list-type for a LIST request", () => {
    // Arrange
    const headers = validHeaders({ "x-type": "LIST" });
    delete headers["x-list-type"];

    // Act
    const result = parsePublicationHeaders(headers);

    // Assert
    expect(result.metadata).toBeUndefined();
    expect(result.errors).toEqual([{ field: "x-list-type", message: "x-list-type is required" }]);
  });

  it.each([["x-provenance"], ["x-court-id"], ["x-content-date"], ["x-list-type"], ["x-language"], ["x-type"]])(
    "should reject a request missing %s",
    (header) => {
      // Arrange
      const headers = validHeaders();
      delete headers[header];

      // Act
      const result = parsePublicationHeaders(headers);

      // Assert
      expect(result.metadata).toBeUndefined();
      expect(result.errors).toEqual(expect.arrayContaining([{ field: header, message: `${header} is required` }]));
    }
  );

  it("should treat a blank header value as absent", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-provenance": "   " }));

    // Assert
    expect(result.metadata).toBeUndefined();
    expect(result.errors).toEqual([{ field: "x-provenance", message: "x-provenance is required" }]);
  });

  it("should trim header values", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-provenance": "  SNL  " }));

    // Assert
    expect(result.metadata?.provenance).toBe("SNL");
  });

  it("should read the first value when a header is repeated", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-provenance": ["SNL", "PDDA"] as unknown as string }));

    // Assert
    expect(result.metadata?.provenance).toBe("SNL");
  });

  it("should fall back to x-location-id when x-court-id is absent", () => {
    // Arrange
    const headers = validHeaders({ "x-location-id": "42" });
    delete headers["x-court-id"];

    // Act
    const result = parsePublicationHeaders(headers);

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.metadata?.courtId).toBe("42");
  });

  it("should prefer x-court-id over x-location-id when both are present", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-court-id": "1", "x-location-id": "42" }));

    // Assert
    expect(result.metadata?.courtId).toBe("1");
  });

  it.each([["FOO"], ["list"], ["JSON"]])("should reject an unrecognised x-type of %s", (value) => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-type": value }));

    // Assert
    expect(result.metadata).toBeUndefined();
    expect(result.errors).toEqual([{ field: "x-type", message: "x-type must be one of LIST, LCSU" }]);
  });

  it("should reject an unrecognised x-language", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-language": "FRENCH" }));

    // Assert
    expect(result.errors).toEqual([{ field: "x-language", message: "x-language must be one of ENGLISH, WELSH, BILINGUAL" }]);
  });

  it("should accept BILINGUAL as an inbound language", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-language": "BILINGUAL" }));

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.metadata?.language).toBe("BILINGUAL");
  });

  it("should reject an unrecognised x-sensitivity", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-sensitivity": "SECRET" }));

    // Assert
    expect(result.errors).toEqual([{ field: "x-sensitivity", message: "x-sensitivity must be one of PUBLIC, PRIVATE, CLASSIFIED" }]);
  });

  it("should accept a date-only x-content-date", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-content-date": "2026-09-14" }));

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.metadata?.contentDate).toBe("2026-09-14");
  });

  it("should reject a malformed x-content-date", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-content-date": "14/09/2026" }));

    // Assert
    expect(result.errors).toEqual([{ field: "x-content-date", message: "x-content-date must be a valid ISO 8601 date or date-time" }]);
  });

  it("should reject a malformed x-display-from", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-display-from": "2026-09-14" }));

    // Assert
    expect(result.errors).toEqual([{ field: "x-display-from", message: "x-display-from must be a valid ISO 8601 date-time" }]);
  });

  it("should reject a malformed x-display-to", () => {
    // Act
    const result = parsePublicationHeaders(validHeaders({ "x-display-to": "not-a-date" }));

    // Assert
    expect(result.errors).toEqual([{ field: "x-display-to", message: "x-display-to must be a valid ISO 8601 date-time" }]);
  });

  it("should report every missing required header at once", () => {
    // Act
    const result = parsePublicationHeaders({});

    // Assert
    // x-list-type is checked after x-type because whether it is required depends on x-type.
    expect(result.errors.map((error) => error.field)).toEqual(["x-provenance", "x-court-id", "x-content-date", "x-language", "x-type", "x-list-type"]);
  });
});
