import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    createJsonValidator: () => mockValidate,
    provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" },
    provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" }
  };
});

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
    MANUAL_UPLOAD: "Manual Upload",
    LIST_ASSIST: "List Assist"
  }
}));

vi.mock("@hmcts/cic-weekly-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/cic-weekly-hearing-list")>();
  return {
    ...actual,
    renderCicWeeklyHearingListData: vi.fn()
  };
});

import { renderCicWeeklyHearingListData } from "@hmcts/cic-weekly-hearing-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById } from "@hmcts/publication";
import { GET } from "./index.js";

describe("CIC Weekly Hearing List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      user: {
        id: "user-123",
        email: "test@example.com",
        roles: ["PUBLIC"]
      }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET handler", () => {
    it("should render the list successfully with valid data", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 10,
        contentDate: new Date("2026-06-15"),
        displayFrom: new Date("2026-06-15"),
        displayTo: new Date("2026-06-21"),
        lastReceivedDate: new Date("2026-06-15T10:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 10,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      const mockJsonData = [
        {
          date: "15/06/2026",
          hearingTime: "10:00",
          caseReferenceNumber: "CIC/2026/001",
          caseName: "AN Other v CICA",
          "venue/platform": "Remote Hearing",
          judges: "Judge Smith",
          members: "Member A, Member B",
          additionalInformation: "Hearing to be held in private"
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Criminal Injuries Compensation Weekly Hearing List",
          weekCommencingDate: "15 June 2026",
          lastUpdatedDate: "15 June 2026",
          lastUpdatedTime: "10:00"
        },
        hearings: [
          {
            date: "15/06/2026",
            hearingTime: "10:00",
            caseReferenceNumber: "CIC/2026/001",
            caseName: "AN Other v CICA",
            venuePlatform: "Remote Hearing",
            judges: "Judge Smith",
            members: "Member A, Member B",
            additionalInformation: "Hearing to be held in private"
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCicWeeklyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(prisma.listType.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(canAccessPublicationData).toHaveBeenCalledWith(
        req.user,
        mockArtefact,
        expect.objectContaining({
          id: 10,
          provenance: "MANUAL_UPLOAD",
          isNonStrategic: true
        })
      );
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderCicWeeklyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Criminal Injuries Compensation Tribunal",
        contentDate: mockArtefact.contentDate,
        lastReceivedDate: mockArtefact.lastReceivedDate,
        listTitle: "Criminal Injuries Compensation Weekly Hearing List"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("(list-types)/cic-weekly-hearing-list/index");
      expect(renderCall[1]).toMatchObject({
        header: mockRenderedData.header,
        hearings: mockRenderedData.hearings,
        dataSource: "Manual Upload"
      });
    });

    it("should return 400 when artefactId is missing", async () => {
      // Arrange
      req.query = {};

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "Missing artefact ID"
        })
      );
    });

    it("should return 404 when artefact is not found", async () => {
      // Arrange
      req.query = { artefactId: "non-existent-artefact" };
      vi.mocked(getArtefactById).mockResolvedValue(null);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
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
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 10,
        contentDate: new Date("2026-06-15"),
        displayFrom: new Date("2026-06-15"),
        displayTo: new Date("2026-06-21"),
        lastReceivedDate: new Date("2026-06-15T10:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 10,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith(
        "errors/403",
        expect.objectContaining({
          en: expect.objectContaining({
            title: "Access denied"
          }),
          cy: expect.objectContaining({
            title: "Mynediad wedi'i wrthod"
          })
        })
      );
    });

    it("should return 404 when JSON file is not found", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 10,
        contentDate: new Date("2026-06-15"),
        displayFrom: new Date("2026-06-15"),
        displayTo: new Date("2026-06-21"),
        lastReceivedDate: new Date("2026-06-15T10:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 10,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "Publication data not found"
        })
      );
    });

    it("should return 400 when JSON validation fails", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 10,
        contentDate: new Date("2026-06-15"),
        displayFrom: new Date("2026-06-15"),
        displayTo: new Date("2026-06-21"),
        lastReceivedDate: new Date("2026-06-15T10:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 10,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      const mockJsonData = [
        {
          date: "invalid-date",
          hearingTime: "10:00",
          caseReferenceNumber: "CIC/2026/001",
          caseName: "AN Other v CICA",
          "venue/platform": "Remote Hearing",
          judges: "Judge Smith",
          members: "Member A, Member B",
          additionalInformation: "Hearing to be held in private"
        }
      ];

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({
        isValid: false,
        errors: ["Invalid date format"]
      });

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "Invalid publication data"
        })
      );
    });

    it("should return 500 on server error", async () => {
      // Arrange
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "An unexpected error occurred"
        })
      );
    });

    it("should use Welsh locale when specified", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 10,
        contentDate: new Date("2026-06-15"),
        displayFrom: new Date("2026-06-15"),
        displayTo: new Date("2026-06-21"),
        lastReceivedDate: new Date("2026-06-15T10:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockListType = {
        id: 10,
        allowedProvenance: "MANUAL_UPLOAD",
        isNonStrategic: true
      };

      const mockJsonData = [
        {
          date: "15/06/2026",
          hearingTime: "10:00",
          caseReferenceNumber: "CIC/2026/001",
          caseName: "AN Other v CICA",
          "venue/platform": "Remote Hearing",
          judges: "Judge Smith",
          members: "Member A, Member B",
          additionalInformation: "Hearing to be held in private"
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Digolledu am Anafiadau Troseddol",
          weekCommencingDate: "15 Mehefin 2026",
          lastUpdatedDate: "15 Mehefin 2026",
          lastUpdatedTime: "10:00"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCicWeeklyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderCicWeeklyHearingListData).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "cy"
        })
      );
    });
  });
});
