import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/ast-daily-hearing-list", () => ({
  cy: {
    listName: "Rhestr o Wrandawiadau Dyddiol Tribiwnlys Cefnogi Ceiswyr Lloches",
    errorTitle: "Gwall",
    errorMessage: "Digwyddodd gwall",
    error403Title: "Gwaharddedig",
    error403Message: "Nid oes gennych ganiatâd"
  },
  en: {
    listName: "Asylum Support Tribunal Daily Hearing List",
    errorTitle: "Error",
    errorMessage: "An error occurred",
    error403Title: "Forbidden",
    error403Message: "You do not have permission"
  },
  renderAstDailyHearingListData: vi.fn((data, options) => ({
    header: {
      listTitle: options.listTitle,
      contentDate: "15 January 2024",
      lastUpdatedDate: "15 January 2024",
      lastUpdatedTime: "09:00"
    },
    hearings: data
  }))
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  canAccessPublicationData: vi.fn(),
  PROVENANCE_LABELS: {
    MANUAL: "Manual"
  }
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/ast-daily-hearing-list/config", () => ({
  schemaPath: "/mock/schema/path.json"
}));

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: vi.fn(() => vi.fn(() => ({ isValid: true, errors: [] })))
}));

describe("ast-daily-hearing-list", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      user: undefined
    };
    mockResponse = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
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
          errorTitle: "Error"
        })
      );
    });

    it("should return 404 when artefact not found", async () => {
      // Arrange
      const { getArtefactById } = await import("@hmcts/publication");
      vi.mocked(getArtefactById).mockResolvedValue(null);
      mockRequest.query = { artefactId: "test-id" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error"
        })
      );
    });

    it("should render page in English locale", async () => {
      // Arrange
      const { getArtefactById, canAccessPublicationData } = await import("@hmcts/publication");
      const { readFile } = await import("node:fs/promises");
      const { prisma } = await import("@hmcts/postgres-prisma");

      const mockArtefact = {
        id: "test-id",
        listTypeId: "list-type-id",
        locationId: "location-id",
        contentDate: new Date("2024-01-15"),
        displayFrom: new Date("2024-01-15T09:00:00"),
        lastReceivedDate: new Date("2024-01-15T09:00:00"),
        provenance: "MANUAL"
      };

      const mockListData = [
        {
          appellant: "Test Appellant",
          appealReferenceNumber: "REF123",
          caseType: "Appeal",
          hearingType: "First Tier",
          hearingTime: "10:00",
          additionalInformation: "None"
        }
      ];

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: "list-type-id",
        allowedProvenance: "MANUAL",
        isNonStrategic: true
      } as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockListData));

      mockRequest.query = { artefactId: "test-id" };
      mockResponse.locals = { locale: "en" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "(list-types)/ast-daily-hearing-list/index",
        expect.objectContaining({
          header: expect.objectContaining({
            listTitle: "Asylum Support Tribunal Daily Hearing List"
          }),
          hearings: mockListData,
          dataSource: "Manual"
        })
      );
    });

    it("should render page in Welsh locale", async () => {
      // Arrange
      const { getArtefactById, canAccessPublicationData } = await import("@hmcts/publication");
      const { readFile } = await import("node:fs/promises");
      const { prisma } = await import("@hmcts/postgres-prisma");

      const mockArtefact = {
        id: "test-id",
        listTypeId: "list-type-id",
        locationId: "location-id",
        contentDate: new Date("2024-01-15"),
        displayFrom: new Date("2024-01-15T09:00:00"),
        lastReceivedDate: new Date("2024-01-15T09:00:00"),
        provenance: "MANUAL"
      };

      const mockListData = [
        {
          appellant: "Test Appellant",
          appealReferenceNumber: "REF123",
          caseType: "Appeal",
          hearingType: "First Tier",
          hearingTime: "10:00",
          additionalInformation: "None"
        }
      ];

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: "list-type-id",
        allowedProvenance: "MANUAL",
        isNonStrategic: true
      } as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockListData));

      mockRequest.query = { artefactId: "test-id" };
      mockResponse.locals = { locale: "cy" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "(list-types)/ast-daily-hearing-list/index",
        expect.objectContaining({
          cy: expect.any(Object),
          t: expect.objectContaining({
            listName: "Rhestr o Wrandawiadau Dyddiol Tribiwnlys Cefnogi Ceiswyr Lloches"
          })
        })
      );
    });

    it("should return 403 when user lacks access", async () => {
      // Arrange
      const { getArtefactById, canAccessPublicationData } = await import("@hmcts/publication");
      const { prisma } = await import("@hmcts/postgres-prisma");

      const mockArtefact = {
        id: "test-id",
        listTypeId: "list-type-id",
        locationId: "location-id",
        contentDate: new Date("2024-01-15"),
        displayFrom: new Date("2024-01-15T09:00:00"),
        lastReceivedDate: new Date("2024-01-15T09:00:00"),
        provenance: "MANUAL"
      };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: "list-type-id",
        allowedProvenance: "MANUAL",
        isNonStrategic: true
      } as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      mockRequest.query = { artefactId: "test-id" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/403",
        expect.objectContaining({
          en: expect.objectContaining({ title: "Forbidden" })
        })
      );
    });
  });
});
