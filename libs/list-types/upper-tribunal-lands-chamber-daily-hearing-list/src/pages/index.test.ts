import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: () => mockValidate
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    LIST_ASSIST: "List Assist"
  }
}));

vi.mock("../rendering/renderer.js", () => ({
  renderUtlcDailyHearingListData: vi.fn()
}));

import { getArtefactById } from "@hmcts/publication";
import { renderUtlcDailyHearingListData } from "../rendering/renderer.js";
import { GET } from "./index.js";

describe("Upper Tribunal (Lands Chamber) page controller", () => {
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
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 29,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          time: "10:00am",
          caseReference: "LC/2026/0001",
          caseName: "Smith v Jones",
          judges: "Judge Smith",
          members: "Member Jones",
          hearingType: "Substantive hearing",
          venue: "Royal Courts of Justice",
          modeOfHearing: "CVP"
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing list",
          hearingDate: "15 January 2026",
          lastUpdatedDate: "15 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: [
          {
            time: "10:00am",
            caseReference: "LC/2026/0001",
            caseName: "Smith v Jones",
            judges: "Judge Smith",
            members: "Member Jones",
            hearingType: "Substantive hearing",
            venue: "Royal Courts of Justice",
            modeOfHearing: "CVP"
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtlcDailyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderUtlcDailyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Upper Tribunal (Lands Chamber)",
        contentDate: mockArtefact.contentDate,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing list"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("upper-tribunal-lands-chamber-daily-hearing-list");
      expect(renderCall[1]).toMatchObject({
        header: mockRenderedData.header,
        hearings: mockRenderedData.hearings,
        dataSource: "Manual Upload"
      });
    });

    it("should return 400 when artefactId is missing", async () => {
      req.query = {};

      await GET(req as Request, res as Response);

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
      req.query = { artefactId: "non-existent-artefact" };

      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Not Found",
          errorMessage: "The requested list could not be found"
        })
      );
    });

    it("should return 404 when JSON file is not found", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 29,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      await GET(req as Request, res as Response);

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
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 29,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [{ time: "10:00am", caseName: "Smith v Jones" }];

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({
        isValid: false,
        errors: ["Missing required field: caseReference"]
      });

      await GET(req as Request, res as Response);

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
      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Server Error",
          errorMessage: "An error occurred while loading the list"
        })
      );
    });

    it("should default to English locale when res.locals has no locale set", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 29,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          time: "10:00am",
          caseReference: "LC/2026/0001",
          caseName: "Smith v Jones",
          judges: "Judge Smith",
          members: "Member Jones",
          hearingType: "Substantive hearing",
          venue: "Royal Courts of Justice",
          modeOfHearing: "CVP"
        }
      ];
      const mockRenderedData = {
        header: {
          listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing list",
          hearingDate: "15 January 2026",
          lastUpdatedDate: "15 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = {};

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtlcDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderUtlcDailyHearingListData).toHaveBeenCalledWith(mockJsonData, expect.objectContaining({ locale: "en" }));
      expect(res.render).toHaveBeenCalledWith("upper-tribunal-lands-chamber-daily-hearing-list", expect.any(Object));
    });

    it("should use the raw provenance value as data source when provenance is not in provenanceLabels", async () => {
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 29,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-15T12:00:00Z"),
        provenance: "UNKNOWN_SOURCE"
      };

      const mockJsonData = [
        {
          time: "10:00am",
          caseReference: "LC/2026/0001",
          caseName: "Smith v Jones",
          judges: "Judge Smith",
          members: "Member Jones",
          hearingType: "Substantive hearing",
          venue: "Royal Courts of Justice",
          modeOfHearing: "CVP"
        }
      ];
      const mockRenderedData = {
        header: {
          listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing list",
          hearingDate: "15 January 2026",
          lastUpdatedDate: "15 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderUtlcDailyHearingListData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[1]).toMatchObject({ dataSource: "UNKNOWN_SOURCE" });
    });
  });
});
