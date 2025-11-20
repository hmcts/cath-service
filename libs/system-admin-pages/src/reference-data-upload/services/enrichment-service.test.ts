import { prisma } from "@hmcts/postgres";
import { describe, expect, it, vi } from "vitest";
import type { ParsedLocationData } from "../model.js";
import { enrichLocationData } from "./enrichment-service.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subJurisdiction: {
      findMany: vi.fn()
    },
    region: {
      findMany: vi.fn()
    }
  }
}));

describe("enrichLocationData", () => {
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

  it("should enrich location data with jurisdiction and Welsh translations", async () => {
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([
      {
        name: "Civil Court",
        welshName: "Llys Sifil",
        jurisdiction: { name: "Civil", welshName: "Sifil" }
      }
    ] as any);

    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London", welshName: "Llundain" }] as any);

    const result = await enrichLocationData(mockData);

    expect(result).toHaveLength(1);
    expect(result[0].jurisdictionNames).toEqual(["Civil"]);
    expect(result[0].jurisdictionWelshNames).toEqual(["Sifil"]);
    expect(result[0].subJurisdictionWelshNames).toEqual(["Llys Sifil"]);
    expect(result[0].regionWelshNames).toEqual(["Llundain"]);
  });

  it("should handle multiple sub-jurisdictions with different parent jurisdictions", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        subJurisdictionNames: ["Civil Court", "Family Court"]
      }
    ];

    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([
      {
        name: "Civil Court",
        welshName: "Llys Sifil",
        jurisdiction: { name: "Civil", welshName: "Sifil" }
      },
      {
        name: "Family Court",
        welshName: "Llys Teulu",
        jurisdiction: { name: "Family", welshName: "Teulu" }
      }
    ] as any);

    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London", welshName: "Llundain" }] as any);

    const result = await enrichLocationData(data);

    expect(result[0].jurisdictionNames).toEqual(["Civil", "Family"]);
    expect(result[0].jurisdictionWelshNames).toEqual(["Sifil", "Teulu"]);
  });

  it("should deduplicate parent jurisdictions from same parent", async () => {
    const data: ParsedLocationData[] = [
      {
        ...mockData[0],
        subJurisdictionNames: ["Civil Court", "Court of Appeal"]
      }
    ];

    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([
      {
        name: "Civil Court",
        welshName: "Llys Sifil",
        jurisdiction: { name: "Civil", welshName: "Sifil" }
      },
      {
        name: "Court of Appeal",
        welshName: "Llys Apêl",
        jurisdiction: { name: "Civil", welshName: "Sifil" }
      }
    ] as any);

    vi.mocked(prisma.region.findMany).mockResolvedValue([{ name: "London", welshName: "Llundain" }] as any);

    const result = await enrichLocationData(data);

    expect(result[0].jurisdictionNames).toEqual(["Civil"]);
    expect(result[0].jurisdictionWelshNames).toEqual(["Sifil"]);
  });
});
