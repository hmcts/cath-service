import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    createJsonValidator: () => mockValidate,
    provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" },
    provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" }
  };
});

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    LIST_ASSIST: "List Assist"
  }
}));

vi.mock("@hmcts/utiac-jr-leeds-daily-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/utiac-jr-leeds-daily-hearing-list")>();
  return {
    ...actual,
    renderUtiacJrLeedsDailyHearingListData: vi.fn()
  };
});

import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { renderUtiacJrLeedsDailyHearingListData } from "@hmcts/utiac-jr-leeds-daily-hearing-list";
import { GET } from "./index.js";

describe("UTIAC JR Leeds Daily Hearing List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {}
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
        listTypeId: 32,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          venue: "Leeds Combined Court Centre",
          judges: "Judge Smith",
          hearingTime: "10:00am",
          caseReferenceNumber: "JR/2026/001",
          caseTitle: "Smith v Secretary of State",
          hearingType: "Permission",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List",
          listForDate: "15 January 2026",
          lastUpdatedDate: "14 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: [
          {
            venue: "Leeds Combined Court Centre",
            judges: "Judge Smith",
            hearingTime: "10:00am",
            caseReferenceNumber: "JR/2026/001",
            caseTitle: "Smith v Secretary of State",
            hearingType: "Permission",
            additionalInformation: ""
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtiacJrLeedsDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(renderUtiacJrLeedsDailyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
        displayFrom: mockArtefact.displayFrom,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("utiac-jr-daily-hearing-list");
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
          errorTitle: "Bad Request",
          errorMessage: "Missing artefactId parameter"
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
          errorTitle: "Not Found",
          errorMessage: "The requested list could not be found"
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
          errorTitle: "Server Error",
          errorMessage: "An error occurred while loading the list"
        })
      );
    });

    it("should return 404 when JSON is not found in blob storage", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(null);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Not Found",
          errorMessage: "The requested list could not be found"
        })
      );
    });

    it("should return 400 when JSON validation fails", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue([{ hearingTime: "invalid" }]);
      mockValidate.mockReturnValue({ isValid: false, errors: ["Invalid data"] });

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Invalid Data",
          errorMessage: "The list data is invalid"
        })
      );
    });

    it("should pass displayFrom to renderer", async () => {
      // Arrange
      const displayFrom = new Date("2026-01-15");
      const mockArtefact = {
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-01"),
        displayFrom,
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockRenderedData = {
        header: {
          listTitle: "UTIAC JR Leeds",
          listForDate: "15 January 2026",
          lastUpdatedDate: "14 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue([]);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtiacJrLeedsDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderUtiacJrLeedsDailyHearingListData).toHaveBeenCalledWith([], expect.objectContaining({ displayFrom }));
    });

    it("should use Welsh locale when specified", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockRenderedData = {
        header: { listTitle: "Welsh placeholder", listForDate: "15 Ionawr 2026", lastUpdatedDate: "14 Ionawr 2026", lastUpdatedTime: "12pm" },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue([]);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtiacJrLeedsDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderUtiacJrLeedsDailyHearingListData).toHaveBeenCalledWith([], expect.objectContaining({ locale: "cy" }));
    });
  });
});
