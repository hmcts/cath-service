import { prisma } from "@hmcts/postgres-prisma";
import { describe, expect, it, vi } from "vitest";
import { generateReferenceDataCsv } from "./download-service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      findMany: vi.fn()
    }
  }
}));

describe("generateReferenceDataCsv", () => {
  it("should generate CSV with all location data", async () => {
    const mockLocations = [
      {
        locationId: 1,
        name: "Test Court",
        welshName: "Llys Prawf",
        email: "test@example.com",
        contactNo: "01234567890",
        locationSubJurisdictions: [{ subJurisdiction: { name: "Civil Court" } }],
        locationRegions: [{ region: { name: "London" } }],
        locationReferences: [{ provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" }]
      }
    ];

    vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);

    const result = await generateReferenceDataCsv();

    expect(result).toContain("LOCATION_ID");
    expect(result).toContain("LOCATION_NAME");
    expect(result).toContain("PROVENANCE");
    expect(result).toContain("PROVENANCE_LOCATION_ID");
    expect(result).toContain("PROVENANCE_LOCATION_TYPE");
    expect(result).toContain("Test Court");
    expect(result).toContain("Llys Prawf");
    expect(result).toContain("Civil Court");
    expect(result).toContain("London");
    expect(result).toContain("SNL");
    expect(result).toContain("snl-001");
    expect(result).toContain("VENUE");
  });

  it("should handle multiple sub-jurisdictions and regions", async () => {
    const mockLocations = [
      {
        locationId: 1,
        name: "Test Court",
        welshName: "Llys Prawf",
        email: "test@example.com",
        contactNo: "01234567890",
        locationSubJurisdictions: [{ subJurisdiction: { name: "Civil Court" } }, { subJurisdiction: { name: "Family Court" } }],
        locationRegions: [{ region: { name: "London" } }, { region: { name: "Midlands" } }],
        locationReferences: [
          { provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" },
          { provenance: "PDDA", provenanceLocationId: "pdda-001", provenanceLocationType: "VENUE" }
        ]
      }
    ];

    vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);

    const result = await generateReferenceDataCsv();

    expect(result).toContain("Civil Court;Family Court");
    expect(result).toContain("London;Midlands");
    expect(result).toContain("SNL;PDDA");
    expect(result).toContain("snl-001;pdda-001");
  });

  it("should handle empty email and contact number", async () => {
    const mockLocations = [
      {
        locationId: 1,
        name: "Test Court",
        welshName: "Llys Prawf",
        email: null,
        contactNo: null,
        locationSubJurisdictions: [{ subJurisdiction: { name: "Civil Court" } }],
        locationRegions: [{ region: { name: "London" } }],
        locationReferences: []
      }
    ];

    vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);

    const result = await generateReferenceDataCsv();

    expect(result).toBeTruthy();
    expect(result).toContain("Test Court");
  });
});
