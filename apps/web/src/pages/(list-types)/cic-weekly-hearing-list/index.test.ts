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

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
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
import { getArtefactById } from "@hmcts/publication";
import { GET } from "./index.js";

describe("CIC Weekly Hearing List page controller", () => {
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
        locationId: "14",
        listTypeId: 29,
        contentDate: new Date("2026-01-05"),
        displayFrom: new Date("2026-01-05"),
        displayTo: new Date("2026-01-11"),
        lastReceivedDate: new Date("2026-01-05T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          date: "05/01/2026",
          hearingTime: "10am",
          caseReferenceNumber: "CIC/2026/001",
          caseName: "Smith v CICA",
          "venue/platform": "Remote",
          judges: "Judge A",
          members: "Member B",
          additionalInformation: "No restrictions"
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Criminal Injuries Compensation Weekly Hearing List",
          weekCommencingDate: "5 January 2026",
          lastUpdatedDate: "5 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: [
          {
            date: "5 January 2026",
            hearingTime: "10am",
            caseReferenceNumber: "CIC/2026/001",
            caseName: "Smith v CICA",
            venuePlatform: "Remote",
            judges: "Judge A",
            members: "Member B",
            additionalInformation: "No restrictions"
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCicWeeklyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderCicWeeklyHearingListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        contentDate: mockArtefact.contentDate,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Criminal Injuries Compensation Weekly Hearing List"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("cic-weekly-hearing-list");
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
        locationId: "14",
        listTypeId: 29,
        contentDate: new Date("2026-01-05"),
        lastReceivedDate: new Date("2026-01-05T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 when JSON validation fails", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "14",
        listTypeId: 29,
        contentDate: new Date("2026-01-05"),
        lastReceivedDate: new Date("2026-01-05T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ date: "invalid" }]));
      mockValidate.mockReturnValue({ isValid: false, errors: ["Invalid date format"] });

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on server error", async () => {
      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should use Welsh locale when specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "14",
        listTypeId: 29,
        contentDate: new Date("2026-01-05"),
        lastReceivedDate: new Date("2026-01-05T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockRenderedData = {
        header: {
          listTitle: "Welsh title",
          weekCommencingDate: "5 Ionawr 2026",
          lastUpdatedDate: "5 Ionawr 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([]));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCicWeeklyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCicWeeklyHearingListData).toHaveBeenCalledWith([], expect.objectContaining({ locale: "cy" }));
    });
  });
});
