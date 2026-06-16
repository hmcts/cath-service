import { readFile } from "node:fs/promises";
import { prisma } from "@hmcts/postgres-prisma";
import * as publicationModule from "@hmcts/publication";
import * as sendModule from "@hmcts/send-daily-hearing-list";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/publication", async () => {
  const actual = await vi.importActual("@hmcts/publication");
  return {
    ...actual,
    getArtefactById: vi.fn(),
    canAccessPublicationData: vi.fn(),
    PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual upload" }
  };
});

vi.mock("@hmcts/send-daily-hearing-list", async () => {
  const actual = await vi.importActual("@hmcts/send-daily-hearing-list");
  return {
    ...actual,
    validateSendDailyHearingList: vi.fn(),
    renderSendData: vi.fn()
  };
});

describe("send-daily-hearing-list", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: { artefactId: "test-artefact-id" },
      user: undefined
    };

    mockResponse = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render the page with hearing list data when all validation passes", async () => {
      // Arrange
      const mockArtefact = {
        id: "test-artefact-id",
        listTypeId: 28,
        locationId: "1",
        contentDate: "2026-06-15",
        lastReceivedDate: "2026-06-15T10:00:00Z",
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 28,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      const mockHearings = [
        {
          time: "10:30am",
          caseReferenceNumber: "SEND/2026/001",
          respondent: "Local Authority",
          hearingType: "First Hearing",
          venue: "Video Hearing",
          timeEstimate: "2 hours"
        }
      ];

      const mockRenderedData = {
        header: {
          listName: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
          contentDate: "15 June 2026",
          lastUpdatedDate: "15 June 2026",
          lastUpdatedTime: "10:00"
        },
        hearings: mockHearings
      };

      vi.mocked(publicationModule.getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(publicationModule.canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockHearings));
      vi.mocked(sendModule.validateSendDailyHearingList).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(sendModule.renderSendData).mockReturnValue(mockRenderedData);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "(list-types)/send-daily-hearing-list/index",
        expect.objectContaining({
          header: mockRenderedData.header,
          hearings: mockHearings,
          dataSource: "Manual upload"
        })
      );
    });

    it("should return 400 when artefactId is missing", async () => {
      // Arrange
      mockRequest.query = {};

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "Missing artefact ID"
        })
      );
    });

    it("should return 404 when artefact is not found", async () => {
      // Arrange
      vi.mocked(publicationModule.getArtefactById).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Not found",
          errorMessage: "Artefact not found"
        })
      );
    });

    it("should return 403 when user does not have access", async () => {
      // Arrange
      const mockArtefact = {
        id: "test-artefact-id",
        listTypeId: 28,
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 28,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      vi.mocked(publicationModule.getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(publicationModule.canAccessPublicationData).mockReturnValue(false);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
    });

    it("should return 400 when validation fails", async () => {
      // Arrange
      const mockArtefact = {
        id: "test-artefact-id",
        listTypeId: 28,
        locationId: "1",
        contentDate: "2026-06-15",
        lastReceivedDate: "2026-06-15T10:00:00Z",
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 28,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      vi.mocked(publicationModule.getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(publicationModule.canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([]));
      vi.mocked(sendModule.validateSendDailyHearingList).mockReturnValue({
        isValid: false,
        errors: ["Invalid data structure"]
      });

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "Invalid publication data"
        })
      );
    });

    it("should render Welsh content when locale is cy", async () => {
      // Arrange
      mockResponse.locals = { locale: "cy" };

      const mockArtefact = {
        id: "test-artefact-id",
        listTypeId: 28,
        locationId: "1",
        contentDate: "2026-06-15",
        lastReceivedDate: "2026-06-15T10:00:00Z",
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 28,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      const mockHearings = [];
      const mockRenderedData = {
        header: {
          listName: "Rhestr Wrandawiadau Dyddiol",
          contentDate: "15 Mehefin 2026",
          lastUpdatedDate: "15 Mehefin 2026",
          lastUpdatedTime: "10:00"
        },
        hearings: mockHearings
      };

      vi.mocked(publicationModule.getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(publicationModule.canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockHearings));
      vi.mocked(sendModule.validateSendDailyHearingList).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(sendModule.renderSendData).mockReturnValue(mockRenderedData);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "(list-types)/send-daily-hearing-list/index",
        expect.objectContaining({
          cy: expect.any(Object),
          en: expect.any(Object)
        })
      );
    });
  });
});
