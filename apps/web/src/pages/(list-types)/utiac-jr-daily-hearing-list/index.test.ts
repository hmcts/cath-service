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

vi.mock("@hmcts/utiac-jr-daily-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/utiac-jr-daily-hearing-list")>();
  return {
    ...actual,
    renderUtiacJrDailyHearingListData: vi.fn(),
    renderUtiacJrLondonDailyHearingListData: vi.fn(),
    validateUtiacJrAnyDailyHearingList: mockValidate
  };
});

import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { renderUtiacJrDailyHearingListData, renderUtiacJrLondonDailyHearingListData } from "@hmcts/utiac-jr-daily-hearing-list";
import { GET } from "./index.js";

describe("UTIAC JR Daily Hearing List unified page controller", () => {
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
    it("should render Leeds list (listTypeId 32) with regional template and correct title", async () => {
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
        hearings: [mockJsonData[0]]
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtiacJrDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(renderUtiacJrDailyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
        displayFrom: mockArtefact.displayFrom,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List"
      });
      expect(vi.mocked(res.render)).toHaveBeenCalledWith(
        "utiac-jr-daily-hearing-list",
        expect.objectContaining({
          header: mockRenderedData.header,
          hearings: mockRenderedData.hearings,
          dataSource: "Manual Upload"
        })
      );
    });

    it("should render London list (listTypeId 31) with London template and London table headers", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-456",
        locationId: "9001",
        listTypeId: 31,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          hearingTime: "10:00am",
          caseTitle: "Smith v Secretary of State",
          representative: "",
          caseReferenceNumber: "JR/2026/001",
          judges: "Judge Smith",
          hearingType: "Permission",
          location: "Field House",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List",
          listForDate: "15 January 2026",
          lastUpdatedDate: "14 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: [mockJsonData[0]]
      };

      req.query = { artefactId: "test-artefact-456" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtiacJrLondonDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderUtiacJrLondonDailyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
        displayFrom: mockArtefact.displayFrom,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List"
      });
      expect(vi.mocked(res.render)).toHaveBeenCalledWith(
        "utiac-jr-london-daily-hearing-list",
        expect.objectContaining({
          header: mockRenderedData.header,
          hearings: mockRenderedData.hearings,
          dataSource: "Manual Upload",
          t: expect.objectContaining({
            tableHeaders: expect.objectContaining({
              location: "Location",
              representative: "Representative"
            })
          })
        })
      );
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

    it("should return 404 when JSON is not found in blob storage", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 32,
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
        listTypeId: 32,
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

    it("should use Welsh locale and pageTitleByListTypeCy when locale is cy", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 32,
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
      vi.mocked(renderUtiacJrDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderUtiacJrDailyHearingListData).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          locale: "cy",
          listTitle: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List']"
        })
      );
    });
  });
});
