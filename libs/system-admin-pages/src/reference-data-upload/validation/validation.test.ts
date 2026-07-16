import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedLocationData } from "../model.js";
import { validateLocationData } from "./validation.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      findFirst: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn()
    },
    region: {
      findMany: vi.fn()
    }
  }
}));

describe("validateLocationData", () => {
  const mockData: ParsedLocationData[] = [
    {
      locationId: 1,
      locationName: "Test Court",
      welshLocationName: "Llys Prawf",
      email: "test@example.com",
      contactNo: "01234567890",
      subJurisdictionNames: ["Civil Court"],
      regionNames: ["London"],
      locationReferences: [{ provenance: "SNL", provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]
    }
  ];

  beforeEach(() => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([{ name: "Civil Court" } as any]);
    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London" } as any]);
  });

  it("should return no errors for valid data", async () => {
    const errors = await validateLocationData(mockData);

    expect(errors).toHaveLength(0);
  });

  it("should return error when locationReferences is empty", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], locationReferences: [] }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("PROVENANCE, PROVENANCE_LOCATION_ID and PROVENANCE_LOCATION_TYPE are required");
  });

  it("should return error for missing location name", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], locationName: "" }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("LOCATION_NAME is required");
  });

  it("should return error for HTML tags in location name", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], locationName: "<script>alert('xss')</script>Test Court" }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("HTML tags");
  });

  it("should return error for missing welsh location name", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], welshLocationName: "" }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("WELSH_LOCATION_NAME is required");
  });

  it("should return error for HTML tags in email", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], email: "<b>test@example.com</b>" }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("EMAIL contains HTML tags");
  });

  it("should return error for missing sub-jurisdiction names", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], subJurisdictionNames: [] }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("SUB_JURISDICTION_NAME is required");
  });

  it("should return error for missing region names", async () => {
    const data: ParsedLocationData[] = [{ ...mockData[0], regionNames: [] }];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("REGION_NAME is required");
  });

  it("should detect duplicate location names with different IDs within file", async () => {
    const data: ParsedLocationData[] = [
      mockData[0],
      {
        ...mockData[0],
        locationId: 2,
        locationReferences: [{ provenance: "COMMON_PLATFORM", provenanceLocationId: "ext-456", provenanceLocationType: "VENUE" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("appears for multiple location IDs in the file");
  });

  it("should produce only one error when the same location name appears across three or more rows with different IDs", async () => {
    const data: ParsedLocationData[] = [
      mockData[0],
      {
        ...mockData[0],
        locationId: 2,
        welshLocationName: "Llys Arall 2",
        locationReferences: [{ provenance: "COMMON_PLATFORM", provenanceLocationId: "ext-456", provenanceLocationType: "VENUE" }]
      },
      {
        ...mockData[0],
        locationId: 3,
        welshLocationName: "Llys Arall 3",
        locationReferences: [{ provenance: "PDDA", provenanceLocationId: "ext-789", provenanceLocationType: "VENUE" }]
      }
    ];

    const errors = await validateLocationData(data);

    const duplicateNameErrors = errors.filter((e) => e.text.includes("appears for multiple location IDs in the file"));
    expect(duplicateNameErrors).toHaveLength(1);
  });

  it("should allow same location name for same locationId with different provenances", async () => {
    const data: ParsedLocationData[] = [
      mockData[0],
      {
        ...mockData[0],
        locationReferences: [{ provenance: "COMMON_PLATFORM", provenanceLocationId: "ext-456", provenanceLocationType: "VENUE" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.every((e) => !e.text.includes("appears for multiple location IDs"))).toBe(true);
  });

  it("should detect duplicate location name in database", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValueOnce({ locationId: 999 } as any);

    const errors = await validateLocationData(mockData);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("already exists in the database");
  });

  it("should return error for non-existent sub-jurisdiction with link to jurisdiction data", async () => {
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([]);

    const errors = await validateLocationData(mockData);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("not found in reference data");
    expect(errors[0].html).toContain("/jurisdiction-data");
    expect(errors[0].html).toContain("Manage jurisdiction data");
  });

  it("should return error for non-existent region", async () => {
    vi.mocked(prisma.region.findMany).mockResolvedValue([]);

    const errors = await validateLocationData(mockData);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("not found in reference data");
  });

  it("should return error when provenance is missing within a reference", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationReferences: [{ provenance: "", provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.some((e) => e.text.includes("PROVENANCE is required"))).toBe(true);
  });

  it("should return error when provenance is an invalid value", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationReferences: [{ provenance: "INVALID_PROVENANCE", provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.some((e) => e.text.includes("PROVENANCE") && e.text.includes("is invalid"))).toBe(true);
  });

  it("should return error when provenanceLocationId is missing within a reference", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationReferences: [{ provenance: "SNL", provenanceLocationId: "", provenanceLocationType: "VENUE" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.some((e) => e.text.includes("PROVENANCE_LOCATION_ID is required"))).toBe(true);
  });

  it("should return error when provenanceLocationType is missing within a reference", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationReferences: [{ provenance: "SNL", provenanceLocationId: "ext-123", provenanceLocationType: "" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.some((e) => e.text.includes("PROVENANCE_LOCATION_TYPE is required"))).toBe(true);
  });

  it("should return error when provenanceLocationType is an invalid value", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationReferences: [{ provenance: "SNL", provenanceLocationId: "ext-123", provenanceLocationType: "INVALID_TYPE" }]
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.some((e) => e.text.includes("PROVENANCE_LOCATION_TYPE") && e.text.includes("is invalid"))).toBe(true);
  });

  it("should return error for duplicate (provenance, provenanceLocationId) in file", async () => {
    const data: ParsedLocationData[] = [
      mockData[0],
      {
        ...mockData[0],
        locationId: 2,
        locationName: "Another Court",
        welshLocationName: "Llys Arall"
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.some((e) => e.text.includes("Duplicate (PROVENANCE, PROVENANCE_LOCATION_ID)"))).toBe(true);
  });

  it("should accept all valid provenance values", async () => {
    for (const provenance of ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"]) {
      const data: ParsedLocationData[] = [
        {
          ...mockData[0],
          locationReferences: [{ provenance, provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]
        }
      ];
      const errors = await validateLocationData(data);

      expect(errors.every((e) => !e.text.includes("PROVENANCE") || !e.text.includes("invalid"))).toBe(true);
    }
  });

  it("should accept all valid provenance location type values", async () => {
    for (const provenanceLocationType of ["VENUE", "REGION", "OWNING_HEARING_LOCATION", "NATIONAL"]) {
      const data: ParsedLocationData[] = [
        {
          ...mockData[0],
          locationReferences: [{ provenance: "SNL", provenanceLocationId: "ext-123", provenanceLocationType }]
        }
      ];
      const errors = await validateLocationData(data);

      expect(errors.every((e) => !e.text.includes("PROVENANCE_LOCATION_TYPE") || !e.text.includes("invalid"))).toBe(true);
    }
  });
});
