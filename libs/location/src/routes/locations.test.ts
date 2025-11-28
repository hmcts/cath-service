import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("../repository/queries.js", () => ({
  getAllLocations: vi.fn()
}));

vi.mock("../repository/service.js", () => ({
  searchLocations: vi.fn()
}));

describe("locations route", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      query: {}
    };

    mockRes = {
      json: jsonMock,
      status: statusMock
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET", () => {
    it("should return all locations when no query parameter is provided", async () => {
      const { GET } = await import("./locations.js");
      const { getAllLocations } = await import("../repository/queries.js");

      const mockLocations = [
        { locationId: 1, name: "Location 1", welshName: "Lleoliad 1", regions: [], subJurisdictions: [] },
        { locationId: 2, name: "Location 2", welshName: "Lleoliad 2", regions: [], subJurisdictions: [] }
      ];

      vi.mocked(getAllLocations).mockResolvedValue(mockLocations);

      await GET(mockReq as Request, mockRes as Response);

      expect(getAllLocations).toHaveBeenCalledWith("en");
      expect(jsonMock).toHaveBeenCalledWith(mockLocations);
    });

    it("should return all locations with cy language", async () => {
      const { GET } = await import("./locations.js");
      const { getAllLocations } = await import("../repository/queries.js");

      mockReq.query = { language: "cy" };

      const mockLocations = [{ locationId: 1, name: "Location 1", welshName: "Lleoliad 1", regions: [], subJurisdictions: [] }];
      vi.mocked(getAllLocations).mockResolvedValue(mockLocations);

      await GET(mockReq as Request, mockRes as Response);

      expect(getAllLocations).toHaveBeenCalledWith("cy");
      expect(jsonMock).toHaveBeenCalledWith(mockLocations);
    });

    it("should search locations when query parameter is provided", async () => {
      const { GET } = await import("./locations.js");
      const { searchLocations } = await import("../repository/service.js");

      mockReq.query = { q: "London" };

      const mockResults = [{ locationId: 1, name: "London Court", welshName: "Llys Llundain", regions: [], subJurisdictions: [] }];
      vi.mocked(searchLocations).mockResolvedValue(mockResults);

      await GET(mockReq as Request, mockRes as Response);

      expect(searchLocations).toHaveBeenCalledWith("London", "en");
      expect(jsonMock).toHaveBeenCalledWith(mockResults);
    });

    it("should search locations with cy language", async () => {
      const { GET } = await import("./locations.js");
      const { searchLocations } = await import("../repository/service.js");

      mockReq.query = { q: "Llundain", language: "cy" };

      const mockResults = [{ locationId: 1, name: "London Court", welshName: "Llys Llundain", regions: [], subJurisdictions: [] }];
      vi.mocked(searchLocations).mockResolvedValue(mockResults);

      await GET(mockReq as Request, mockRes as Response);

      expect(searchLocations).toHaveBeenCalledWith("Llundain", "cy");
      expect(jsonMock).toHaveBeenCalledWith(mockResults);
    });

    it("should handle errors when getAllLocations fails", async () => {
      const { GET } = await import("./locations.js");
      const { getAllLocations } = await import("../repository/queries.js");

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Database error");

      vi.mocked(getAllLocations).mockRejectedValue(error);

      await GET(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching locations:", error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Failed to fetch locations" });

      consoleErrorSpy.mockRestore();
    });

    it("should handle errors when searchLocations fails", async () => {
      const { GET } = await import("./locations.js");
      const { searchLocations } = await import("../repository/service.js");

      mockReq.query = { q: "London" };

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Search error");

      vi.mocked(searchLocations).mockRejectedValue(error);

      await GET(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching locations:", error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Failed to fetch locations" });

      consoleErrorSpy.mockRestore();
    });
  });
});
