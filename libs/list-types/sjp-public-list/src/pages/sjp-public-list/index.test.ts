import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/list-types-common");

import { calculatePagination, getSjpListById, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/list-types-common";

describe("SJP Public List Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.render = vi.fn().mockReturnValue(res);
    res.redirect = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render 400 error when artefactId is missing", async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/400", expect.objectContaining({ locale: "en" }));
    });

    it("should render 404 error when list is not found", async () => {
      const req = mockRequest({ query: { artefactId: "nonexistent" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue(null);

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", expect.objectContaining({ locale: "en" }));
    });

    it("should render 404 error when list type is not public", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", expect.objectContaining({ locale: "en" }));
    });

    it("should render public list with cases and pagination", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123", page: "2" }
      });
      const res = mockResponse();

      const mockList = {
        artefactId: "test-123",
        listType: "public" as const,
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 300,
        locationId: 1
      };

      const mockCases = [
        {
          caseId: "case-1",
          name: "J Doe",
          postcode: "SW1A",
          prosecutor: "CPS",
          offence: "Speeding"
        }
      ];

      vi.mocked(getSjpListById).mockResolvedValue(mockList);
      vi.mocked(getSjpPublicCases).mockResolvedValue({
        cases: mockCases,
        totalCases: 300
      });
      vi.mocked(getUniqueProsecutors).mockResolvedValue(["CPS", "DVLA"]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({
        postcodes: ["SW1A", "M1"],
        hasLondonPostcodes: true,
        londonPostcodes: ["SW1A"]
      });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
        nextPage: null,
        previousPage: 1
      });

      await GET(req, res);

      expect(getSjpListById).toHaveBeenCalledWith("test-123");
      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", { searchQuery: undefined, postcode: undefined, prosecutor: undefined }, 2, "name", "asc");
      expect(getUniqueProsecutors).toHaveBeenCalledWith("test-123");
      expect(getUniquePostcodes).toHaveBeenCalledWith("test-123");
      expect(calculatePagination).toHaveBeenCalledWith(2, 300, 200);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-public-list/index",
        expect.objectContaining({
          list: mockList,
          cases: mockCases,
          casesRows: [[{ text: "J Doe" }, { text: "SW1A" }, { text: "Speeding" }, { text: "CPS" }]],
          prosecutors: ["CPS", "DVLA"],
          postcodeAreas: ["SW1A", "M1"],
          hasLondonPostcodes: true,
          londonPostcodes: ["SW1A"],
          pagination: expect.any(Object),
          filters: { searchQuery: undefined, postcode: undefined, prosecutor: undefined },
          sortBy: "name",
          sortOrder: "asc"
        })
      );
    });

    it("should apply filters from query parameters", async () => {
      const req = mockRequest({
        query: {
          artefactId: "test-123",
          page: "1",
          search: "Smith",
          postcode: "SW1A",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPublicCases).mockResolvedValue({ cases: [], totalCases: 0 });
      vi.mocked(getUniqueProsecutors).mockResolvedValue([]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({ postcodes: [], hasLondonPostcodes: false, londonPostcodes: [] });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: null,
        previousPage: null
      });

      await GET(req, res);

      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", { searchQuery: "Smith", postcode: "SW1A", prosecutor: "CPS" }, 1, "name", "asc");
    });

    it("should handle custom sort parameters", async () => {
      const req = mockRequest({
        query: {
          artefactId: "test-123",
          sortBy: "postcode",
          sortOrder: "desc"
        }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPublicCases).mockResolvedValue({ cases: [], totalCases: 0 });
      vi.mocked(getUniqueProsecutors).mockResolvedValue([]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({ postcodes: [], hasLondonPostcodes: false, londonPostcodes: [] });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: null,
        previousPage: null
      });

      await GET(req, res);

      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", expect.any(Object), 1, "postcode", "desc");
    });

    it("should default to page 1 when page is not provided", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123" }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPublicCases).mockResolvedValue({ cases: [], totalCases: 0 });
      vi.mocked(getUniqueProsecutors).mockResolvedValue([]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({ postcodes: [], hasLondonPostcodes: false, londonPostcodes: [] });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: null,
        previousPage: null
      });

      await GET(req, res);

      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", expect.any(Object), 1, "name", "asc");
    });

    it("should format cases as table rows", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123" }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPublicCases).mockResolvedValue({
        cases: [
          { caseId: "1", name: "John Doe", postcode: "M1", offence: "Speeding", prosecutor: "CPS" },
          { caseId: "2", name: "Jane Smith", postcode: null, offence: null, prosecutor: null }
        ],
        totalCases: 2
      });

      vi.mocked(getUniqueProsecutors).mockResolvedValue([]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({ postcodes: [], hasLondonPostcodes: false, londonPostcodes: [] });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: null,
        previousPage: null
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-public-list/index",
        expect.objectContaining({
          casesRows: [
            [{ text: "John Doe" }, { text: "M1" }, { text: "Speeding" }, { text: "CPS" }],
            [{ text: "Jane Smith" }, { text: "" }, { text: "" }, { text: "" }]
          ]
        })
      );
    });

    it("should use Welsh translations when locale is cy", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123" }
      });
      const res = mockResponse();
      res.locals.locale = "cy";

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPublicCases).mockResolvedValue({ cases: [], totalCases: 0 });
      vi.mocked(getUniqueProsecutors).mockResolvedValue([]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({ postcodes: [], hasLondonPostcodes: false, londonPostcodes: [] });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: null,
        previousPage: null
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-public-list/index", expect.objectContaining({ locale: "cy" }));
    });
  });

  describe("POST", () => {
    it("should redirect with artefactId only when no filters provided", async () => {
      const req = mockRequest({
        body: { artefactId: "test-123" }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list?artefactId=test-123");
    });

    it("should redirect with all filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "  Smith  ",
          postcode: "  SW1A  ",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list?artefactId=test-123&search=Smith&postcode=SW1A&prosecutor=CPS");
    });

    it("should trim search query and postcode whitespace", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "  test query  ",
          postcode: "  M1  "
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list?artefactId=test-123&search=test+query&postcode=M1");
    });

    it("should skip empty filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "",
          postcode: "  ",
          prosecutor: undefined
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list?artefactId=test-123");
    });
  });
});
