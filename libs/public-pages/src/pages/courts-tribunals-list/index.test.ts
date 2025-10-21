import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/location", () => ({
  getAllJurisdictions: vi.fn(() => [
    { jurisdictionId: 1, name: "Civil", welshName: "Sifil" },
    { jurisdictionId: 2, name: "Family", welshName: "Teulu" },
    { jurisdictionId: 3, name: "Crime", welshName: "Trosedd" },
    { jurisdictionId: 4, name: "Tribunal", welshName: "Tribiwnlys" }
  ]),
  getAllRegions: vi.fn(() => [
    { regionId: 1, name: "London", welshName: "Llundain" },
    { regionId: 2, name: "Midlands", welshName: "Canolbarth Lloegr" },
    { regionId: 3, name: "South East", welshName: "De Ddwyrain" },
    { regionId: 4, name: "North", welshName: "Gogledd" },
    { regionId: 5, name: "Wales", welshName: "Cymru" }
  ]),
  getAllSubJurisdictions: vi.fn(() => [
    { subJurisdictionId: 1, name: "Civil Court", welshName: "Llys Sifil", jurisdictionId: 1 },
    { subJurisdictionId: 2, name: "Family Court", welshName: "Llys Teulu", jurisdictionId: 2 },
    { subJurisdictionId: 3, name: "Employment Tribunal", welshName: "Tribiwnlys Cyflogaeth", jurisdictionId: 4 },
    { subJurisdictionId: 4, name: "Crown Court", welshName: "Llys y Goron", jurisdictionId: 1 },
    { subJurisdictionId: 7, name: "Magistrates Court", welshName: "Llys Ynadon", jurisdictionId: 3 }
  ]),
  getLocationsGroupedByLetter: vi.fn((_language: string, filters?: any) => {
    const allLocations = {
      B: [
        {
          locationId: 2,
          name: "Birmingham Civil and Family Justice Centre",
          welshName: "Canolfan Cyfiawnder Sifil a Theulu Birmingham",
          regions: [2],
          subJurisdictions: [1, 2]
        }
      ],
      C: [
        {
          locationId: 5,
          name: "Cardiff Civil and Family Justice Centre",
          welshName: "Canolfan Cyfiawnder Sifil a Theulu Caerdydd",
          regions: [5],
          subJurisdictions: [1, 2]
        }
      ],
      R: [{ locationId: 4, name: "Royal Courts of Justice", welshName: "Llysoedd Barn Brenhinol", regions: [1], subJurisdictions: [1, 4] }]
    };

    if (!filters || (!filters.regions && !filters.subJurisdictions)) {
      return allLocations;
    }

    const filtered: Record<string, any[]> = {};
    for (const [letter, locations] of Object.entries(allLocations)) {
      const matchingLocations = locations.filter((loc: any) => {
        const regionMatch = !filters.regions || filters.regions.length === 0 || loc.regions.some((r: number) => filters.regions.includes(r));
        const subJurisdictionMatch =
          !filters.subJurisdictions || filters.subJurisdictions.length === 0 || loc.subJurisdictions.some((s: number) => filters.subJurisdictions.includes(s));
        return regionMatch && subJurisdictionMatch;
      });
      if (matchingLocations.length > 0) {
        filtered[letter] = matchingLocations;
      }
    }
    return filtered;
  })
}));

describe("courts-tribunals-list", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      query: {}
    };

    mockResponse = {
      render: vi.fn(),
      locals: {
        locale: "en"
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render courts-tribunals-list page with no filters", async () => {
      const { GET } = await import("./index.js");

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          groupedLocations: expect.any(Object),
          jurisdictionItems: expect.any(Array),
          regionItems: expect.any(Array),
          subJurisdictionItemsByJurisdiction: expect.any(Object)
        })
      );
    });

    it("should filter by region when region query parameter is provided", async () => {
      mockRequest.query = { region: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          selectedRegions: [1]
        })
      );
    });

    it("should filter by multiple regions", async () => {
      mockRequest.query = { region: ["1", "5"] };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          selectedRegions: [1, 5]
        })
      );
    });

    it("should filter by sub-jurisdiction when subJurisdiction query parameter is provided", async () => {
      mockRequest.query = { subJurisdiction: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          selectedSubJurisdictions: [1]
        })
      );
    });

    it("should expand sub-jurisdictions when jurisdiction is selected without specific sub-jurisdiction", async () => {
      mockRequest.query = { jurisdiction: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const groupedLocations = renderCall.groupedLocations;

      // Should have filtered by all sub-jurisdictions of Civil (1, 4)
      expect(Object.keys(groupedLocations).length).toBeGreaterThan(0);
    });

    it("should build jurisdiction items sorted alphabetically", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const jurisdictionItems = renderCall.jurisdictionItems;

      expect(jurisdictionItems.length).toBe(4);
      for (let i = 0; i < jurisdictionItems.length - 1; i++) {
        expect(jurisdictionItems[i].text.localeCompare(jurisdictionItems[i + 1].text)).toBeLessThanOrEqual(0);
      }
    });

    it("should build region items sorted alphabetically", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const regionItems = renderCall.regionItems;

      expect(regionItems.length).toBe(5);
      for (let i = 0; i < regionItems.length - 1; i++) {
        expect(regionItems[i].text.localeCompare(regionItems[i + 1].text)).toBeLessThanOrEqual(0);
      }
    });

    it("should build sub-jurisdiction items sorted alphabetically within each jurisdiction", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const subJurisdictionItemsByJurisdiction = renderCall.subJurisdictionItemsByJurisdiction;

      for (const jurisdictionId in subJurisdictionItemsByJurisdiction) {
        const items = subJurisdictionItemsByJurisdiction[jurisdictionId];
        for (let i = 0; i < items.length - 1; i++) {
          expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
        }
      }
    });

    it("should mark selected jurisdictions as checked", async () => {
      mockRequest.query = { jurisdiction: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const jurisdictionItems = renderCall.jurisdictionItems;

      const civilItem = jurisdictionItems.find((item: any) => item.value === "1");
      expect(civilItem.checked).toBe(true);

      const familyItem = jurisdictionItems.find((item: any) => item.value === "2");
      expect(familyItem.checked).toBe(false);
    });

    it("should mark selected regions as checked", async () => {
      mockRequest.query = { region: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const regionItems = renderCall.regionItems;

      const londonItem = regionItems.find((item: any) => item.value === "1");
      expect(londonItem.checked).toBe(true);

      const midlandsItem = regionItems.find((item: any) => item.value === "2");
      expect(midlandsItem.checked).toBe(false);
    });

    it("should mark selected sub-jurisdictions as checked", async () => {
      mockRequest.query = { subJurisdiction: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const subJurisdictionItemsByJurisdiction = renderCall.subJurisdictionItemsByJurisdiction;

      const civilCourtItem = subJurisdictionItemsByJurisdiction[1].find((item: any) => item.value === "1");
      expect(civilCourtItem.checked).toBe(true);
    });

    it("should build remove URLs for selected filters", async () => {
      mockRequest.query = { jurisdiction: "1", region: "1", subJurisdiction: "1" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];

      expect(renderCall.jurisdictionRemoveUrls).toHaveLength(1);
      expect(renderCall.regionRemoveUrls).toHaveLength(1);
      expect(renderCall.subJurisdictionRemoveUrls).toHaveLength(1);
    });

    it("should use Welsh content when locale is cy", async () => {
      mockResponse.locals = { locale: "cy" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const jurisdictionItems = renderCall.jurisdictionItems;

      const civilItem = jurisdictionItems.find((item: any) => item.value === "1");
      expect(civilItem.text).toBe("Sifil");
    });

    it("should build table rows from grouped locations", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const tableRows = renderCall.tableRows;

      expect(tableRows.length).toBeGreaterThan(0);
      expect(tableRows[0]).toHaveProperty("letter");
      expect(tableRows[0]).toHaveProperty("location");
      expect(tableRows[0]).toHaveProperty("isFirst");
    });

    it("should include available letters from grouped locations", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const availableLetters = renderCall.availableLetters;

      expect(availableLetters).toBeInstanceOf(Array);
      expect(availableLetters.length).toBeGreaterThan(0);
    });
  });
});
