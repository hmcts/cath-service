import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PushHeaderParams } from "./headers.js";
import { buildPdfPushHeaders, buildPushHeaders, resolveSourceArtefactId } from "./headers.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn((args: { where: { id: number } }) => (args.where.id === 99 ? { name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } : null))
    }
  }
}));

// A zone behind UTC, so local-time getters would put a UTC-midnight date on the previous day.
const NON_UTC_TIME_ZONE = "America/New_York";
const originalTimeZone = process.env.TZ;

const baseParams: PushHeaderParams = {
  artefactId: "artefact-abc-123",
  sourceArtefactId: "source-xyz.json",
  type: "LIST",
  listTypeId: 99,
  contentDate: new Date("2024-03-15T10:00:00.000Z"),
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  displayFrom: new Date("2024-03-15T00:00:00.000Z"),
  displayTo: new Date("2024-03-22T00:00:00.000Z"),
  provenance: "SNL",
  location: {
    locationId: 1,
    name: "Birmingham Crown Court",
    welshName: "Llys y Goron Birmingham",
    regions: [{ name: "Midlands", welshName: "Y Canolbarth" }],
    subJurisdictions: [
      {
        name: "Crime",
        welshName: "Trosedd",
        jurisdictionName: "Crown",
        jurisdictionWelshName: "Y Goron"
      }
    ]
  }
};

beforeAll(() => {
  process.env.TZ = NON_UTC_TIME_ZONE;
});

afterAll(() => {
  process.env.TZ = originalTimeZone;
});

describe("buildPushHeaders", () => {
  it("should run these tests in a non-UTC time zone", () => {
    // Arrange
    const utcMidnight = new Date("2024-06-15T00:00:00.000Z");

    // Act
    const localDay = utcMidnight.getDate();

    // Assert
    expect(localDay).toBe(14);
  });

  it("should return all 12 headers with the artefact's values", async () => {
    // Act
    const headers = await buildPushHeaders(baseParams);

    // Assert
    expect(headers).toEqual({
      "x-provenance": "SNL",
      "x-source-artefact-id": "source-xyz.json",
      "x-type": "LIST",
      "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      "x-content-date": "2024-03-15T10:00",
      "x-sensitivity": "PUBLIC",
      "x-language": "ENGLISH",
      "x-display-from": "2024-03-15T00:00",
      "x-display-to": "2024-03-22T00:00",
      "x-location-name": "Birmingham Crown Court",
      "x-location-jurisdiction": "Crown",
      "x-location-region": "Midlands"
    });
  });

  it.each([
    { description: "UTC midnight", date: "2026-11-16T00:00:00.000Z", expected: "2026-11-16T00:00" },
    { description: "a time with seconds", date: "2026-11-16T09:30:15.000Z", expected: "2026-11-16T09:30:15" },
    { description: "a time with milliseconds", date: "2026-11-16T09:30:00.120Z", expected: "2026-11-16T09:30:00.120" },
    { description: "a single-digit millisecond", date: "2026-11-16T09:30:05.007Z", expected: "2026-11-16T09:30:05.007" },
    { description: "a BST date stored as UTC midnight", date: "2026-06-15T00:00:00.000Z", expected: "2026-06-15T00:00" },
    { description: "the last minute of the UTC day", date: "2026-12-31T23:59:00.000Z", expected: "2026-12-31T23:59" }
  ])("should format $description as $expected in every date header", async ({ date, expected }) => {
    // Arrange
    const value = new Date(date);

    // Act
    const headers = await buildPushHeaders({ ...baseParams, contentDate: value, displayFrom: value, displayTo: value });

    // Assert
    expect(headers["x-content-date"]).toBe(expected);
    expect(headers["x-display-from"]).toBe(expected);
    expect(headers["x-display-to"]).toBe(expected);
  });

  it.each([
    { description: "both are null", displayFrom: null, displayTo: null, expectedKeys: [] },
    { description: "both are undefined", displayFrom: undefined, displayTo: undefined, expectedKeys: [] },
    { description: "only displayFrom is set", displayFrom: new Date("2024-03-15T00:00:00.000Z"), displayTo: null, expectedKeys: ["x-display-from"] },
    { description: "only displayTo is set", displayFrom: null, displayTo: new Date("2024-03-22T00:00:00.000Z"), expectedKeys: ["x-display-to"] }
  ])("should include only the display date headers that have values when $description", async ({ displayFrom, displayTo, expectedKeys }) => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, displayFrom, displayTo });

    // Assert
    expect(Object.keys(headers).filter((key) => key.startsWith("x-display-"))).toEqual(expectedKeys);
  });

  it.each([
    { description: "a sourceArtefactId", sourceArtefactId: "hearing-list.xlsx", expected: "hearing-list.xlsx" },
    { description: "a null sourceArtefactId", sourceArtefactId: null, expected: "artefact-abc-123" },
    { description: "an empty sourceArtefactId", sourceArtefactId: "", expected: "artefact-abc-123" },
    { description: "a Latin-1 accented sourceArtefactId", sourceArtefactId: "café-list.csv", expected: "café-list.csv" },
    { description: "a sourceArtefactId with a Welsh letter", sourceArtefactId: "Llŵyd-list.csv", expected: "artefact-abc-123" },
    { description: "a sourceArtefactId with a curly apostrophe", sourceArtefactId: "court’s-list.xlsx", expected: "artefact-abc-123" },
    { description: "a sourceArtefactId with a line break", sourceArtefactId: "list.csv\r\nx-evil: 1", expected: "artefact-abc-123" }
  ])("should set x-source-artefact-id to $expected for $description", async ({ sourceArtefactId, expected }) => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, sourceArtefactId });

    // Assert
    expect(headers["x-source-artefact-id"]).toBe(expected);
  });

  it.each([
    { language: "ENGLISH", expected: "ENGLISH" },
    { language: "WELSH", expected: "WELSH" },
    { language: "BILINGUAL", expected: "BI_LINGUAL" }
  ])("should send x-language $expected for $language", async ({ language, expected }) => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, language });

    // Assert
    expect(headers["x-language"]).toBe(expected);
  });

  it.each([
    { sensitivity: "", expected: "PUBLIC" },
    { sensitivity: "PRIVATE", expected: "PRIVATE" },
    { sensitivity: "CLASSIFIED", expected: "CLASSIFIED" }
  ])("should send x-sensitivity $expected for sensitivity '$sensitivity'", async ({ sensitivity, expected }) => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, sensitivity });

    // Assert
    expect(headers["x-sensitivity"]).toBe(expected);
  });

  it("should send x-type from the artefact type", async () => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, type: "GENERAL_PUBLICATION" });

    // Assert
    expect(headers["x-type"]).toBe("GENERAL_PUBLICATION");
  });

  it("should join distinct jurisdictions and every region with commas", async () => {
    // Arrange
    const location = {
      locationId: 3,
      name: "Cardiff Civil and Family Justice Centre",
      welshName: "Canolfan Cyfiawnder Sifil a Theulu Caerdydd",
      regions: [
        { name: "Wales", welshName: "Cymru" },
        { name: "South West", welshName: "De Orllewin" }
      ],
      subJurisdictions: [
        { name: "Civil Court", welshName: "Llys Sifil", jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" },
        { name: "High Court", welshName: "Uchel Lys", jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" },
        { name: "Family Court", welshName: "Llys Teulu", jurisdictionName: "Family", jurisdictionWelshName: "Teulu" }
      ]
    };

    // Act
    const headers = await buildPushHeaders({ ...baseParams, location });

    // Assert
    expect(headers["x-location-jurisdiction"]).toBe("Civil,Family");
    expect(headers["x-location-region"]).toBe("Wales,South West");
  });

  it.each([
    { description: "undefined", location: undefined, expectedName: "" },
    { description: "null", location: null, expectedName: "" },
    {
      description: "missing regions and jurisdictions",
      location: { locationId: 2, name: "Remote Court", welshName: "Llys Pell", regions: [], subJurisdictions: [] },
      expectedName: "Remote Court"
    }
  ])("should fall back to empty location headers when the location is $description", async ({ location, expectedName }) => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, location });

    // Assert
    expect(headers["x-location-name"]).toBe(expectedName);
    expect(headers["x-location-jurisdiction"]).toBe("");
    expect(headers["x-location-region"]).toBe("");
  });

  it("should fall back to String(listTypeId) for x-list-type when the list type name is unknown", async () => {
    // Act
    const headers = await buildPushHeaders({ ...baseParams, listTypeId: 1234 });

    // Assert
    expect(headers["x-list-type"]).toBe("1234");
  });
});

describe("buildPdfPushHeaders", () => {
  it("should override only x-provenance with CATH", async () => {
    // Arrange
    const headers = await buildPushHeaders(baseParams);

    // Act
    const pdfHeaders = buildPdfPushHeaders(headers);

    // Assert
    expect(pdfHeaders).toEqual({ ...headers, "x-provenance": "CATH" });
    expect(headers["x-provenance"]).toBe("SNL");
  });
});

describe("resolveSourceArtefactId", () => {
  it.each([
    { sourceArtefactId: "ABC123", expected: "ABC123" },
    { sourceArtefactId: null, expected: "artefact-1" },
    { sourceArtefactId: "", expected: "artefact-1" }
  ])("should return $expected for sourceArtefactId $sourceArtefactId", ({ sourceArtefactId, expected }) => {
    // Act
    const result = resolveSourceArtefactId("artefact-1", sourceArtefactId);

    // Assert
    expect(result).toBe(expected);
  });
});
