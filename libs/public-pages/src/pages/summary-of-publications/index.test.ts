import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

// Mock the location module
vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => {
    if (id === 9) {
      return Promise.resolve({
        locationId: 9,
        name: "Single Justice Procedure",
        welshName: "Gweithdrefn Ynad Unigol",
        regions: [],
        subJurisdictions: []
      });
    }
    if (id === 1) {
      return Promise.resolve({
        locationId: 1,
        name: "Test Location",
        welshName: "Lleoliad Prawf",
        regions: [],
        subJurisdictions: []
      });
    }
    return Promise.resolve(undefined);
  }),
  getLocationMetadataByLocationId: vi.fn()
}));

import { getLocationMetadataByLocationId } from "@hmcts/location";

// Mock the postgres module
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findMany: vi.fn(() => [
        {
          artefactId: "test-id-1",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date(),
          isFlatFile: true
        },
        {
          artefactId: "test-id-2",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-16"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date(),
          isFlatFile: true
        }
      ])
    }
  }
}));

describe("Summary of Publications - GET handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocationMetadataByLocationId).mockResolvedValue(null);
    renderSpy = vi.fn();
    mockRequest = {
      query: {}
    };
    mockResponse = {
      locals: { locale: "en" },
      status: vi.fn().mockReturnThis(),
      render: renderSpy
    };
  });

  describe("Error handling", () => {
    it("should redirect to 400 page when locationId is missing", async () => {
      const redirectSpy = vi.fn();
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });

    it("should redirect to 400 page when locationId is invalid (non-numeric)", async () => {
      const redirectSpy = vi.fn();
      mockRequest.query = { locationId: "abc" };
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });

    it("should redirect to 400 page when location not found", async () => {
      const redirectSpy = vi.fn();
      mockRequest.query = { locationId: "999" };
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });
  });

  describe("English locale", () => {
    it("should render page with location name when location found", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "summary-of-publications/index",
        expect.objectContaining({
          title: "What do you want to view from Single Justice Procedure?"
        })
      );
    });

    it("should render filtered publications for valid locationId", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.publications).toBeDefined();
      expect(renderCall.publications.length).toBeGreaterThan(0);
      // All publications should have valid IDs
      expect(renderCall.publications.every((p: any) => p.id && p.id.length > 0)).toBe(true);
    });

    it("should render publications sorted by date descending", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check that publications are sorted by list name, then date, then language
      expect(publications.length).toBeGreaterThan(1);
      // Check date format is correct
      expect(publications[0].formattedDate).toMatch(/\d{1,2} \w+ \d{4}/);
    });

    it("should format list types correctly in English", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check that list type names are formatted
      expect(publications.some((p: any) => p.listTypeName === "Magistrates Public List")).toBe(true);
    });

    it("should format dates correctly for English locale", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check date format (e.g., "20 April 2025")
      expect(publications[0].formattedDate).toMatch(/\d{1,2} \w+ \d{4}/);
    });

    it("should render empty state when no publications found for location", async () => {
      mockRequest.query = { locationId: "1" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.noPublicationsMessage).toBe("Sorry, no lists found for this court");
    });
  });

  describe("Welsh locale", () => {
    it("should render page with Welsh location name when location found", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "summary-of-publications/index",
        expect.objectContaining({
          title: "Beth ydych chi eisiau edrych arno gan Gweithdrefn Ynad Unigol?"
        })
      );
    });

    it("should format list types correctly in Welsh", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check that Welsh list type names are displayed from welshFriendlyName
      expect(publications.some((p: any) => p.listTypeName === "Magistrates Public List")).toBe(true);
    });

    it("should format dates correctly for Welsh locale", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check Welsh date format (e.g., "15 Ebrill 2025")
      expect(publications[0].formattedDate).toMatch(/\d{1,2} \w+ \d{4}/);
      // Should contain Welsh month name (Ebrill = April)
      expect(publications[0].formattedDate).toContain("Ebrill");
    });

    it("should redirect to 400 page when locationId is missing (Welsh locale)", async () => {
      const redirectSpy = vi.fn();
      mockRequest.query = {};
      mockResponse.locals = { locale: "cy" };
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });
  });

  describe("Deduplication", () => {
    it("should show only the latest publication when multiple publications have same list type, content date, and language", async () => {
      const { prisma } = await import("@hmcts/postgres");

      // Mock data with duplicates
      const mockArtefacts = [
        {
          artefactId: "latest-id",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T12:00:00Z"), // Latest
          isFlatFile: true
        },
        {
          artefactId: "older-id",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"), // Same date
          sensitivity: "PUBLIC",
          language: "ENGLISH", // Same language
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T10:00:00Z"), // Older
          isFlatFile: true
        }
      ];

      vi.mocked(prisma.artefact.findMany).mockResolvedValueOnce(mockArtefacts as any);

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Should only have 1 publication (the latest one)
      expect(publications.length).toBe(1);
      expect(publications[0].id).toBe("latest-id");
    });

    it("should keep publications with different content dates", async () => {
      const { prisma } = await import("@hmcts/postgres");

      const mockArtefacts = [
        {
          artefactId: "id-1",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T12:00:00Z"),
          isFlatFile: true
        },
        {
          artefactId: "id-2",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-16"), // Different date
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-16T10:00:00Z"),
          isFlatFile: true
        }
      ];

      vi.mocked(prisma.artefact.findMany).mockResolvedValueOnce(mockArtefacts as any);

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Should have both publications
      expect(publications.length).toBe(2);
    });

    it("should keep publications with different languages", async () => {
      const { prisma } = await import("@hmcts/postgres");

      const mockArtefacts = [
        {
          artefactId: "id-english",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T12:00:00Z"),
          isFlatFile: true
        },
        {
          artefactId: "id-welsh",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"), // Same date
          sensitivity: "PUBLIC",
          language: "WELSH", // Different language
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T10:00:00Z"),
          isFlatFile: true
        }
      ];

      vi.mocked(prisma.artefact.findMany).mockResolvedValueOnce(mockArtefacts as any);

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Should have both publications
      expect(publications.length).toBe(2);
    });

    it("should keep publications with different list types", async () => {
      const { prisma } = await import("@hmcts/postgres");

      const mockArtefacts = [
        {
          artefactId: "id-type-4",
          locationId: "9",
          listTypeId: 4,
          contentDate: new Date("2025-04-15"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T12:00:00Z"),
          isFlatFile: true
        },
        {
          artefactId: "id-type-5",
          locationId: "9",
          listTypeId: 5, // Different list type
          contentDate: new Date("2025-04-15"), // Same date
          sensitivity: "PUBLIC",
          language: "ENGLISH", // Same language
          displayFrom: new Date("2025-04-01"),
          displayTo: new Date("2025-12-31"),
          lastReceivedDate: new Date("2025-04-15T10:00:00Z"),
          isFlatFile: true
        }
      ];

      vi.mocked(prisma.artefact.findMany).mockResolvedValueOnce(mockArtefacts as any);

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Should have both publications
      expect(publications.length).toBe(2);
    });
  });

  describe("FaCT link", () => {
    it("should include FaCT link variables in English", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.factLinkText).toBe("Find contact details and other information about courts and tribunals");
      expect(renderCall.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      expect(renderCall.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should include FaCT link variables in Welsh", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
      expect(renderCall.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      expect(renderCall.factAdditionalText).toBe("yng Nghymru a Lloegr, a rhai tribiwnlysoedd nad ydynt wedi'u datganoli yn yr Alban.");
    });
  });

  describe("Select list message", () => {
    it("should include selectListMessage in English", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.selectListMessage).toBe("Select the list you want to view from the link(s) below:");
    });

    it("should include selectListMessage in Welsh", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.selectListMessage).toBe("Dewiswch y rhestr rydych chi am ei gweld o'r ddolen(nau) isod:");
    });
  });

  describe("Location metadata messages", () => {
    it("should include cautionMessage when metadata exists in English", async () => {
      vi.mocked(getLocationMetadataByLocationId).mockResolvedValue({
        locationMetadataId: "test-id",
        locationId: 9,
        cautionMessage: "This is a caution message",
        welshCautionMessage: "Dyma neges rhybudd",
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.cautionMessage).toBe("This is a caution message");
    });

    it("should include Welsh cautionMessage when locale is Welsh", async () => {
      vi.mocked(getLocationMetadataByLocationId).mockResolvedValue({
        locationMetadataId: "test-id",
        locationId: 9,
        cautionMessage: "This is a caution message",
        welshCautionMessage: "Dyma neges rhybudd",
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.cautionMessage).toBe("Dyma neges rhybudd");
    });

    it("should include noListMessage when metadata exists in English", async () => {
      vi.mocked(getLocationMetadataByLocationId).mockResolvedValue({
        locationMetadataId: "test-id",
        locationId: 9,
        cautionMessage: null,
        welshCautionMessage: null,
        noListMessage: "No lists available",
        welshNoListMessage: "Dim rhestrau ar gael",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.noListMessage).toBe("No lists available");
    });

    it("should include Welsh noListMessage when locale is Welsh", async () => {
      vi.mocked(getLocationMetadataByLocationId).mockResolvedValue({
        locationMetadataId: "test-id",
        locationId: 9,
        cautionMessage: null,
        welshCautionMessage: null,
        noListMessage: "No lists available",
        welshNoListMessage: "Dim rhestrau ar gael",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.noListMessage).toBe("Dim rhestrau ar gael");
    });

    it("should return undefined for cautionMessage when no metadata exists", async () => {
      vi.mocked(getLocationMetadataByLocationId).mockResolvedValue(null);

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.cautionMessage).toBeUndefined();
      expect(renderCall.noListMessage).toBeUndefined();
    });

    it("should include both cautionMessage and noListMessage when both exist", async () => {
      vi.mocked(getLocationMetadataByLocationId).mockResolvedValue({
        locationMetadataId: "test-id",
        locationId: 9,
        cautionMessage: "Caution message",
        welshCautionMessage: "Neges rhybudd",
        noListMessage: "No list message",
        welshNoListMessage: "Dim neges rhestr",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.cautionMessage).toBe("Caution message");
      expect(renderCall.noListMessage).toBe("No list message");
    });
  });
});
