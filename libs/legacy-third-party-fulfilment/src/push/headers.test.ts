import { describe, expect, it, vi } from "vitest";
import type { PushHeaderParams } from "./headers.js";
import { buildPushHeaders } from "./headers.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn((args: { where: { id: number } }) => (args.where.id === 99 ? { name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } : null))
    }
  }
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
  it("returns all 12 required headers with correct values", async () => {
    const headers = await buildPushHeaders(baseParams);

    expect(Object.keys(headers)).toHaveLength(12);

    expect(headers["x-provenance"]).toBe("SNL");
    expect(headers["x-source-artefact-id"]).toBe("artefact-abc-123");
    expect(headers["x-type"]).toBe("LIST");
    expect(headers["x-list-type"]).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
    expect(headers["x-content-date"]).toBe("2024-03-15");
    expect(headers["x-sensitivity"]).toBe("PUBLIC");
    expect(headers["x-language"]).toBe("ENGLISH");
    expect(headers["x-display-from"]).toBe("2024-03-15");
    expect(headers["x-display-to"]).toBe("2024-03-22");
    expect(headers["x-location-name"]).toBe("Birmingham Crown Court");
    expect(headers["x-location-jurisdiction"]).toBe("Crown");
    expect(headers["x-location-region"]).toBe("Midlands");
  });

  it("date fields are date-only strings (YYYY-MM-DD)", async () => {
    const headers = await buildPushHeaders(baseParams);

    expect(headers["x-content-date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(headers["x-display-from"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(headers["x-display-to"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to empty string when location is undefined", async () => {
    const headers = await buildPushHeaders({ ...baseParams, location: undefined });

    expect(headers["x-location-name"]).toBe("");
    expect(headers["x-location-jurisdiction"]).toBe("");
    expect(headers["x-location-region"]).toBe("");
  });

  it("falls back to empty string when location is null", async () => {
    const headers = await buildPushHeaders({ ...baseParams, location: null });

    expect(headers["x-location-name"]).toBe("");
    expect(headers["x-location-jurisdiction"]).toBe("");
    expect(headers["x-location-region"]).toBe("");
  });

  it("falls back to empty string when location has empty regions and subJurisdictions", async () => {
    const headers = await buildPushHeaders({
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

  it("always uses LIST for x-type and falls back to String(listTypeId) for x-list-type when list type name is unknown", async () => {
    const headers = await buildPushHeaders({ ...baseParams, listTypeId: 1234 });

    expect(headers["x-type"]).toBe("LIST");
    expect(headers["x-list-type"]).toBe("1234");
  });
});
