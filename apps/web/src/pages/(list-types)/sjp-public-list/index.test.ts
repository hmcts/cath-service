import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn()
  }
}));

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    calculatePagination: vi.fn(),
    getSjpListById: vi.fn(),
    getSjpPublicCases: vi.fn(),
    getUniquePostcodes: vi.fn(),
    getUniqueProsecutors: vi.fn(),
    createConverter: vi.fn(),
    registerConverter: vi.fn()
  };
});

// @hmcts/publication is deliberately NOT mocked: the real canAccessPublicationData runs so the
// authorisation assertions below fail if the sensitivity check is ever unwired (VIBE-521).
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: { findUnique: vi.fn() },
    listType: { findUnique: vi.fn() }
  }
}));

import fs from "node:fs/promises";
import { calculatePagination, getSjpListById, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";

const ARTEFACT_ID = "12345678-1234-1234-1234-123456789abc";
const ALLOWED_PROVENANCE = "PI_AAD";

/** Stubs the artefact row the page authorises against. Sensitivity is the only access authority. */
const givenArtefact = (sensitivity: string) => {
  vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
    artefactId: ARTEFACT_ID,
    type: "LIST",
    locationId: "1",
    listTypeId: 999,
    listType: { name: "SJP_PUBLIC_LIST" },
    contentDate: new Date("2025-01-20"),
    sensitivity,
    language: "ENGLISH",
    displayFrom: new Date("2025-01-01"),
    displayTo: new Date("2099-12-31"),
    lastReceivedDate: new Date("2025-01-20"),
    isFlatFile: false,
    provenance: "MANUAL_UPLOAD",
    noMatch: false
  } as never);
  vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 999, allowedProvenance: ALLOWED_PROVENANCE, isNonStrategic: false } as never);
};

const renderedTheList = (res: Response) => vi.mocked(res.render).mock.calls.some(([view]) => view === "sjp-public-list");

describe("SJP Public List Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      path: "/sjp-public-list",
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.render = vi.fn().mockReturnValue(res);
    res.redirect = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));
    givenArtefact("PUBLIC");
  });

  // Regression cover for VIBE-521 — anonymous disclosure of PRIVATE/CLASSIFIED SJP lists.
  describe("access control", () => {
    const ANONYMOUS = undefined;
    const VERIFIED_MATCHING = { role: "VERIFIED", provenance: ALLOWED_PROVENANCE };
    const VERIFIED_OTHER_PROVENANCE = { role: "VERIFIED", provenance: "CRIME_IDAM" };
    const CTSC_ADMIN = { role: "INTERNAL_ADMIN_CTSC" };

    /** The stored payload always looks like a valid public list — the old, broken gate. */
    const givenPublicShapedPayload = () => {
      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: ARTEFACT_ID,
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 1,
        locationId: 1
      } as never);
      vi.mocked(getSjpPublicCases).mockResolvedValue({
        cases: [{ caseId: "c1", name: "A Defendant", postcode: "BS1", offence: "Speeding", prosecutor: "CPS" }],
        totalCases: 1
      } as never);
      vi.mocked(getUniqueProsecutors).mockResolvedValue(["CPS"]);
      vi.mocked(getUniquePostcodes).mockResolvedValue({ postcodes: ["BS1"], hasLondonPostcodes: false, londonPostcodes: [] });
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        startIndex: 0,
        endIndex: 1,
        hasPrevious: false,
        hasNext: false,
        items: []
      } as never);
    };

    const requestAs = (user: object | undefined) => mockRequest({ query: { artefactId: ARTEFACT_ID }, user } as Partial<Request>);

    beforeEach(() => {
      givenPublicShapedPayload();
    });

    it("should serve the list to an anonymous caller when the artefact is PUBLIC", async () => {
      // Arrange
      givenArtefact("PUBLIC");
      const res = mockResponse();

      // Act
      await GET(requestAs(ANONYMOUS), res);

      // Assert
      expect(renderedTheList(res)).toBe(true);
    });

    it.each(["PRIVATE", "CLASSIFIED"])("should refuse an anonymous caller with 403 and read no case data when the artefact is %s", async (sensitivity) => {
      // Arrange
      givenArtefact(sensitivity);
      const res = mockResponse();

      // Act
      await GET(requestAs(ANONYMOUS), res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(renderedTheList(res)).toBe(false);
      expect(getSjpPublicCases).not.toHaveBeenCalled();
    });

    it("should set a no-store Cache-Control header when access is denied", async () => {
      // Arrange
      givenArtefact("CLASSIFIED");
      const res = mockResponse();

      // Act
      await GET(requestAs(ANONYMOUS), res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it.each(["PUBLIC", "PRIVATE", "CLASSIFIED"])(
      "should serve the list at %s sensitivity to a VERIFIED user whose provenance matches the list type",
      async (sensitivity) => {
        // Arrange
        givenArtefact(sensitivity);
        const res = mockResponse();

        // Act
        await GET(requestAs(VERIFIED_MATCHING), res);

        // Assert
        expect(renderedTheList(res)).toBe(true);
      }
    );

    it("should refuse a CLASSIFIED artefact when the VERIFIED user's provenance is not allowed for the list type", async () => {
      // Arrange
      givenArtefact("CLASSIFIED");
      const res = mockResponse();

      // Act
      await GET(requestAs(VERIFIED_OTHER_PROVENANCE), res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(renderedTheList(res)).toBe(false);
    });

    it.each(["PRIVATE", "CLASSIFIED"])("should refuse a metadata-only CTSC admin the data for a %s artefact", async (sensitivity) => {
      // Arrange
      givenArtefact(sensitivity);
      const res = mockResponse();

      // Act
      await GET(requestAs(CTSC_ADMIN), res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(renderedTheList(res)).toBe(false);
    });

    it("should authorise against the artefact sensitivity rather than the payload list type", async () => {
      // Arrange — the payload claims to be a public list, but the artefact is CLASSIFIED
      givenArtefact("CLASSIFIED");
      const res = mockResponse();

      // Act
      await GET(requestAs(ANONYMOUS), res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(renderedTheList(res)).toBe(false);
    });

    it("should treat an unrecognised sensitivity as non-public", async () => {
      // Arrange — fail closed rather than falling through to a render
      givenArtefact("Public");
      const res = mockResponse();

      // Act
      await GET(requestAs(ANONYMOUS), res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(renderedTheList(res)).toBe(false);
    });

    it("should render 404 and read no case data when the artefact does not exist", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);
      const res = mockResponse();

      // Act
      await GET(requestAs(ANONYMOUS), res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(getSjpPublicCases).not.toHaveBeenCalled();
    });
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
        totalItems: 300,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: true,
        pageNumbers: [1, 2]
      });

      await GET(req, res);

      expect(getSjpListById).toHaveBeenCalledWith("test-123");
      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", { postcodes: undefined, prosecutors: undefined }, 2, "", "asc");
      expect(getUniqueProsecutors).toHaveBeenCalledWith("test-123");
      expect(getUniquePostcodes).toHaveBeenCalledWith("test-123");
      expect(calculatePagination).toHaveBeenCalledWith(2, 300, 1000);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-public-list",
        expect.objectContaining({
          list: mockList,
          cases: mockCases,
          casesRows: [[{ text: "J Doe" }, { text: "SW1A" }, { text: "Speeding" }, { text: "CPS" }]],
          totalCases: 300,
          prosecutors: ["CPS", "DVLA"],
          postcodeAreas: ["SW1A", "M1"],
          hasLondonPostcodes: true,
          londonPostcodes: ["SW1A"],
          pagination: expect.any(Object),
          filters: { postcodes: [], prosecutors: [] },
          sortBy: "",
          sortOrder: "asc"
        })
      );
    });

    it("should apply filters from query parameters", async () => {
      const req = mockRequest({
        query: {
          artefactId: "test-123",
          page: "1",
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", { postcodes: ["SW1A"], prosecutors: ["CPS"] }, 1, "", "asc");
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(getSjpPublicCases).toHaveBeenCalledWith("test-123", expect.any(Object), 1, "", "asc");
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-public-list",
        expect.objectContaining({
          casesRows: [
            [{ text: "John Doe" }, { text: "M1" }, { text: "Speeding" }, { text: "CPS" }],
            [{ text: "Jane Smith" }, { text: "" }, { text: "" }, { text: "" }]
          ]
        })
      );
    });

    it("should pass downloadDisclaimerUrl when files exist and user is verified", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123" },
        user: { role: "VERIFIED" } as any
      });
      const res = mockResponse();

      vi.mocked(fs.access).mockResolvedValue(undefined);

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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-public-list",
        expect.objectContaining({
          downloadDisclaimerUrl: "/sjp-public-list/list-download-disclaimer?artefactId=test-123"
        })
      );
    });

    it("should pass null downloadDisclaimerUrl when no files exist", async () => {
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-public-list",
        expect.objectContaining({
          downloadDisclaimerUrl: null
        })
      );
    });

    it("should pass showFilter=true to template when showFilter query param is set", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123", showFilter: "true" }
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-public-list", expect.objectContaining({ showFilter: true }));
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
        totalItems: 0,
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-public-list", expect.objectContaining({ locale: "cy" }));
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
          postcode: "  SW1A  ",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list?artefactId=test-123&postcode=SW1A&prosecutor=CPS");
    });

    it("should trim postcode whitespace", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          postcode: "  M1  "
        }
      });
      const res = mockResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list?artefactId=test-123&postcode=M1");
    });

    it("should skip empty filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
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
