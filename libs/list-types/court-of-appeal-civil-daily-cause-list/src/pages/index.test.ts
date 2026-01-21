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
  renderCourtOfAppealCivil: vi.fn()
}));

import { getArtefactById } from "@hmcts/publication";
import { renderCourtOfAppealCivil } from "../rendering/renderer.js";
import { GET } from "./index.js";

describe("Court of Appeal Civil Division page controller", () => {
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
        listTypeId: 19,
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = {
        dailyHearings: [
          {
            venue: "Court 71",
            judge: "Lord Justice Smith",
            time: "10.30am",
            caseNumber: "CA-2026-000123",
            caseDetails: "Appellant v Respondent",
            hearingType: "Appeal hearing",
            additionalInformation: "Reserved judgment"
          }
        ],
        futureJudgments: []
      };

      const mockRenderedData = {
        header: {
          listTitle: "Court of Appeal (Civil Division) Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026 at 12pm"
        },
        dailyHearings: [
          {
            venue: "Court 71",
            judge: "Lord Justice Smith",
            time: "10:30am",
            caseNumber: "CA-2026-000123",
            caseDetails: "Appellant v Respondent",
            hearingType: "Appeal hearing",
            additionalInformation: "Reserved judgment"
          }
        ],
        futureJudgments: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCourtOfAppealCivil).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderCourtOfAppealCivil).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        displayFrom: mockArtefact.displayFrom,
        displayTo: mockArtefact.displayTo,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString()
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("court-of-appeal-civil-daily-cause-list");
      expect(renderCall[1]).toMatchObject({
        header: mockRenderedData.header,
        dailyHearings: mockRenderedData.dailyHearings,
        futureJudgments: mockRenderedData.futureJudgments,
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

    it("should return 400 when artefactId is not a string", async () => {
      req.query = { artefactId: ["array", "value"] };

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

    it("should return 400 when list type is not 19", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 1,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Invalid List Type",
          errorMessage: "This list type is not supported by this module"
        })
      );
    });

    it("should return 404 when JSON file is not found", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 19,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT: no such file or directory"));

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
        listTypeId: 19,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = {
        dailyHearings: [{ invalid: "data" }],
        futureJudgments: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({
        isValid: false,
        errors: ["Missing required field: venue"]
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
          errorTitle: "Error",
          errorMessage: "An error occurred while displaying the list"
        })
      );
    });

    it("should use Welsh locale when specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 19,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = {
        dailyHearings: [],
        futureJudgments: []
      };

      const mockRenderedData = {
        header: {
          listTitle: "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)",
          listDate: "Rhestr ar gyfer 15 Ionawr 2026",
          lastUpdated: "Diweddarwyd ddiwethaf 14 Ionawr 2026"
        },
        dailyHearings: [],
        futureJudgments: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCourtOfAppealCivil).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCourtOfAppealCivil).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should default to English locale when locale is not specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 19,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = {
        dailyHearings: [],
        futureJudgments: []
      };

      const mockRenderedData = {
        header: {
          listTitle: "Court of Appeal (Civil Division) Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026"
        },
        dailyHearings: [],
        futureJudgments: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = {};

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCourtOfAppealCivil).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCourtOfAppealCivil).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "en"
        })
      );
    });

    it("should use provenance label from PROVENANCE_LABELS", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 19,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "LIST_ASSIST"
      };

      const mockJsonData = {
        dailyHearings: [],
        futureJudgments: []
      };

      const mockRenderedData = {
        header: {
          listTitle: "Court of Appeal (Civil Division) Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026"
        },
        dailyHearings: [],
        futureJudgments: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCourtOfAppealCivil).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[1]).toMatchObject({
        dataSource: "List Assist"
      });
    });

    it("should fall back to raw provenance if label not found", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 19,
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "UNKNOWN_SOURCE"
      };

      const mockJsonData = {
        dailyHearings: [],
        futureJudgments: []
      };

      const mockRenderedData = {
        header: {
          listTitle: "Court of Appeal (Civil Division) Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026"
        },
        dailyHearings: [],
        futureJudgments: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCourtOfAppealCivil).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[1]).toMatchObject({
        dataSource: "UNKNOWN_SOURCE"
      });
    });
  });
});
