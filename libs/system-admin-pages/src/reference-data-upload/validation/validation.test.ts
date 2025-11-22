import { prisma } from "@hmcts/postgres";
import { describe, expect, it, vi } from "vitest";
import type { ParsedLocationData } from "../model.js";
import { validateLocationData } from "./validation.js";

vi.mock("@hmcts/postgres", () => ({
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
      regionNames: ["London"]
    }
  ];

  it("should return no errors for valid data", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([{ name: "Civil Court" } as any]);
    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London" } as any]);

    const errors = await validateLocationData(mockData);

    expect(errors).toHaveLength(0);
  });

  it("should return error for missing location name", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationName: ""
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("LOCATION_NAME is required");
  });

  it("should return error for HTML tags in location name", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationName: "<script>alert('xss')</script>Test Court"
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("HTML tags");
  });

  it("should return error for missing welsh location name", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        welshLocationName: ""
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("WELSH_LOCATION_NAME is required");
  });

  it("should return error for HTML tags in email", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        email: "<b>test@example.com</b>"
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("EMAIL contains HTML tags");
  });

  it("should return error for missing sub-jurisdiction names", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        subJurisdictionNames: []
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("SUB_JURISDICTION_NAME is required");
  });

  it("should return error for missing region names", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        regionNames: []
      }
    ];

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("REGION_NAME is required");
  });

  it("should detect duplicate location names within file", async () => {
    const data: ParsedLocationData[] = [
      mockData[0],
      {
        ...mockData[0],
        locationId: 2
      }
    ];

    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);

    const errors = await validateLocationData(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("appears more than once in the file");
  });

  it("should detect duplicate location name in database", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValueOnce({ locationId: 999 } as any);
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([{ name: "Civil Court" } as any]);
    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London" } as any]);

    const errors = await validateLocationData(mockData);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("already exists in the database");
  });

  it("should return error for non-existent sub-jurisdiction", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London" } as any]);

    const errors = await validateLocationData(mockData);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("not found in reference data");
  });

  it("should return error for non-existent region", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([{ name: "Civil Court" } as any]);
    vi.mocked(prisma.region.findMany).mockResolvedValue([]);

    const errors = await validateLocationData(mockData);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("not found in reference data");
  });
});
