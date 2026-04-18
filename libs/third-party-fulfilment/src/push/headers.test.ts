import { describe, expect, it, vi } from "vitest";
import type { PushHeaderParams } from "./headers.js";
import { buildPushHeaders } from "./headers.js";

vi.mock("@hmcts/list-types-common", () => ({
  getListTypeName: vi.fn((id: number) => (id === 99 ? "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" : undefined))
}));

const contentDate = new Date("2024-03-15T10:00:00.000Z");
const displayFrom = new Date("2024-03-15T00:00:00.000Z");
const displayTo = new Date("2024-03-22T00:00:00.000Z");

const baseParams: PushHeaderParams = {
  artefactId: "artefact-abc-123",
  listTypeId: 99,
  contentDate,
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  displayFrom,
  displayTo,
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

describe("buildPushHeaders", () => {
  it("returns all 12 required headers with correct values", () => {
    const headers = buildPushHeaders(baseParams);

    expect(Object.keys(headers)).toHaveLength(12);

    expect(headers["x-provenance"]).toBe("SNL");
    expect(headers["x-source-artefact-id"]).toBe("artefact-abc-123");
    expect(headers["x-type"]).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
    expect(headers["x-list-type"]).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
    expect(headers["x-content-date"]).toBe("2024-03-15T10:00:00.000Z");
    expect(headers["x-sensitivity"]).toBe("PUBLIC");
    expect(headers["x-language"]).toBe("ENGLISH");
    expect(headers["x-display-from"]).toBe("2024-03-15T00:00:00.000Z");
    expect(headers["x-display-to"]).toBe("2024-03-22T00:00:00.000Z");
    expect(headers["x-location-name"]).toBe("Birmingham Crown Court");
    expect(headers["x-location-jurisdiction"]).toBe("Crown");
    expect(headers["x-location-region"]).toBe("Midlands");
  });

  it("date fields are ISO strings", () => {
    const headers = buildPushHeaders(baseParams);

    expect(headers["x-content-date"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(headers["x-display-from"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(headers["x-display-to"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("falls back to empty string when location is undefined", () => {
    const headers = buildPushHeaders({ ...baseParams, location: undefined });

    expect(headers["x-location-name"]).toBe("");
    expect(headers["x-location-jurisdiction"]).toBe("");
    expect(headers["x-location-region"]).toBe("");
  });

  it("falls back to empty string when location is null", () => {
    const headers = buildPushHeaders({ ...baseParams, location: null });

    expect(headers["x-location-name"]).toBe("");
    expect(headers["x-location-jurisdiction"]).toBe("");
    expect(headers["x-location-region"]).toBe("");
  });

  it("falls back to empty string when location has empty regions and subJurisdictions", () => {
    const headers = buildPushHeaders({
      ...baseParams,
      location: {
        locationId: 2,
        name: "Remote Court",
        welshName: "Llys Pell",
        regions: [],
        subJurisdictions: []
      }
    });

    expect(headers["x-location-name"]).toBe("Remote Court");
    expect(headers["x-location-jurisdiction"]).toBe("");
    expect(headers["x-location-region"]).toBe("");
  });

  it("falls back to String(listTypeId) for x-type and x-list-type when list type name is unknown", () => {
    const headers = buildPushHeaders({ ...baseParams, listTypeId: 1234 });

    expect(headers["x-type"]).toBe("1234");
    expect(headers["x-list-type"]).toBe("1234");
  });
});
