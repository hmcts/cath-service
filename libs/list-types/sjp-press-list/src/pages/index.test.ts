import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/list-types-common");

import { calculatePagination, getSjpListById, getSjpPressCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/list-types-common";

describe("SJP Press List Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      isAuthenticated: vi.fn(() => true),
      user: { role: "VERIFIED" },
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
    process.env.NODE_ENV = "production";
  });

  describe("GET", () => {
    it("should render 403 error when user is not authenticated in production", async () => {
      const req = mockRequest({ isAuthenticated: vi.fn(() => false) });
      const res = mockResponse();

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.objectContaining({ locale: "en" }));
    });

    it("should render 403 error when user is not VERIFIED in production", async () => {
      const req = mockRequest({ user: { role: "MEDIA" } });
      const res = mockResponse();

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.objectContaining({ locale: "en" }));
    });

    it("should skip authentication check in development mode", async () => {
      process.env.NODE_ENV = "development";
      const req = mockRequest({
        isAuthenticated: vi.fn(() => false),
        query: { artefactId: "test-123", page: "1" }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [],
        totalCases: 0
      });

      vi.mocked(getUniqueProsecutors).mockResolvedValue([]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({
        postcodes: [],
        hasLondonPostcodes: false,
        londonPostcodes: []
      });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: null,
        previousPage: null
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-press-list/index", expect.any(Object));
    });

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

    it("should render 404 error when list type is not press", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", expect.objectContaining({ locale: "en" }));
    });

    it("should render press list with cases and pagination", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123", page: "2" }
      });
      const res = mockResponse();

      const mockList = {
        artefactId: "test-123",
        listType: "press" as const,
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 300,
        locationId: 1
      };

      const mockCases = [
        {
          caseId: "case-1",
          name: "John Doe",
          postcode: "SW1A",
          prosecutor: "CPS",
          dateOfBirth: new Date("1990-01-01"),
          age: 35,
          reference: "REF123",
          address: "123 Test St, London",
          offences: [{ offenceTitle: "Speeding", offenceWording: "Exceeded speed limit", reportingRestriction: false }]
        }
      ];

      vi.mocked(getSjpListById).mockResolvedValue(mockList);
      vi.mocked(getSjpPressCases).mockResolvedValue({
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
      expect(getSjpPressCases).toHaveBeenCalledWith("test-123", { searchQuery: undefined, postcode: undefined, prosecutor: undefined }, 2);
      expect(getUniqueProsecutors).toHaveBeenCalledWith("test-123");
      expect(getUniquePostcodes).toHaveBeenCalledWith("test-123");
      expect(calculatePagination).toHaveBeenCalledWith(2, 300, 200);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-press-list/index",
        expect.objectContaining({
          list: mockList,
          cases: mockCases,
          prosecutors: ["CPS", "DVLA"],
          postcodeAreas: ["SW1A", "M1"],
          hasLondonPostcodes: true,
          londonPostcodes: ["SW1A"],
          pagination: expect.any(Object),
          filters: { searchQuery: undefined, postcode: undefined, prosecutor: undefined },
          errors: undefined
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
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({ cases: [], totalCases: 0 });
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

      expect(getSjpPressCases).toHaveBeenCalledWith("test-123", { searchQuery: "Smith", postcode: "SW1A", prosecutor: "CPS" }, 1);
    });

    it("should use Welsh translations when locale is cy", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123" }
      });
      const res = mockResponse();
      res.locals.locale = "cy";

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({ cases: [], totalCases: 0 });
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

      expect(res.render).toHaveBeenCalledWith("sjp-press-list/index", expect.objectContaining({ locale: "cy" }));
    });
  });

  describe("POST", () => {
    it("should render 403 error when user is not authenticated in production", async () => {
      const req = mockRequest({ isAuthenticated: vi.fn(() => false) });
      const res = mockResponse();

      await POST(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.objectContaining({ locale: "en" }));
    });

    it("should redirect with artefactId only when no filters provided", async () => {
      const req = mockRequest({
        body: { artefactId: "test-123" }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123");
    });

    it("should redirect with all filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "  Smith  ",
          postcode: "SW1A",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123&search=Smith&postcode=SW1A&prosecutor=CPS");
    });

    it("should trim search query whitespace", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "  test query  "
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123&search=test+query");
    });

    it("should skip empty filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "",
          postcode: undefined,
          prosecutor: null
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123");
    });
  });
});
