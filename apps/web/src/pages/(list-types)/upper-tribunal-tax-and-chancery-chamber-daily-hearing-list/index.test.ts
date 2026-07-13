import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: () => mockValidate
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, allowedProvenance: "MANUAL_UPLOAD", isNonStrategic: true })
    }
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  canAccessPublicationData: vi.fn().mockReturnValue(true),
  resolveListType: vi.fn().mockResolvedValue({ id: 1, provenance: "CFT_IDAM", isNonStrategic: false }),
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "ListAssist"
  }
}));

vi.mock("@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list", () => ({
  upperTribunalTaxAndChanceryChamberDailyHearingListEn: {
    pageTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing list",
    provenanceLabels: { MANUAL_UPLOAD: "Manual Upload" }
  },
  upperTribunalTaxAndChanceryChamberDailyHearingListCy: {
    pageTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing list",
    provenanceLabels: { MANUAL_UPLOAD: "Manual Upload" }
  },
  renderUtccDailyHearingListData: vi.fn()
}));

vi.mock("@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/config", () => ({
  moduleRoot: "/mock/utcc",
  schemaPath: "/mock/utcc/schema.json"
}));

import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { renderUtccDailyHearingListData } from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import { GET } from "./index.js";

describe("Upper Tribunal Tax and Chancery Chamber page controller", () => {
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
        listTypeId: 999,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          time: "10:00am",
          caseReferenceNumber: "UTTC/2026/0001",
          caseName: "Smith v HMRC",
          judges: "Judge Smith",
          members: "Member Jones",
          hearingType: "Substantive hearing",
          venue: "Field House",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing list",
          hearingDate: "15 January 2026",
          lastUpdatedDate: "15 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: mockJsonData
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtccDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(getPublicationJson).toHaveBeenCalledWith("test-artefact-123");
      expect(renderUtccDailyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        contentDate: mockArtefact.contentDate,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing list"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list");
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

    it("should return 404 when JSON blob is not found", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 999,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
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
        locationId: "9001",
        listTypeId: 999,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue([{ time: "10:00am" }]);
      mockValidate.mockReturnValue({ isValid: false, errors: ["Missing required field: caseReferenceNumber"] });

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
          errorTitle: "Error",
          errorMessage: "An error occurred while displaying the list"
        })
      );
    });

    it("should use Welsh locale when specified", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 999,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockRenderedData = {
        header: {
          listTitle: "Welsh title",
          hearingDate: "15 January 2026",
          lastUpdatedDate: "15 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue([]);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtccDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderUtccDailyHearingListData).toHaveBeenCalledWith([], expect.objectContaining({ locale: "cy" }));
    });

    it("should use raw provenance when not in PROVENANCE_LABELS", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 999,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "UNKNOWN_SOURCE"
      };

      const mockRenderedData = {
        header: { listTitle: "Title", hearingDate: "15 January 2026", lastUpdatedDate: "15 January 2026", lastUpdatedTime: "12pm" },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue([]);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtccDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[1]).toMatchObject({ dataSource: "UNKNOWN_SOURCE" });
    });
  });
});
