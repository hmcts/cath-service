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

vi.mock("@hmcts/send-daily-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/send-daily-hearing-list")>();
  return {
    ...actual,
    renderSendDailyHearingListData: vi.fn()
  };
});

import { getArtefactById } from "@hmcts/publication";
import { renderSendDailyHearingListData } from "@hmcts/send-daily-hearing-list";
import { GET } from "./index.js";

describe("SEND Daily Hearing List page controller", () => {
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
        locationId: "13",
        listTypeId: 28,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          time: "10am",
          caseReferenceNumber: "SEND/2026/001",
          respondent: "Local Authority",
          hearingType: "Final",
          venue: "Remote",
          timeEstimate: "2 hours"
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
          lastUpdatedDate: "1 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: [
          {
            time: "10am",
            caseReferenceNumber: "SEND/2026/001",
            respondent: "Local Authority",
            hearingType: "Final",
            venue: "Remote",
            timeEstimate: "2 hours"
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSendDailyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("send-daily-hearing-list");
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
        locationId: "13",
        listTypeId: 28,
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
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
        locationId: "13",
        listTypeId: 28,
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ time: "invalid" }]));
      mockValidate.mockReturnValue({ isValid: false, errors: ["Invalid time format"] });

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
        locationId: "13",
        listTypeId: 28,
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockRenderedData = {
        header: { listTitle: "Welsh title", lastUpdatedDate: "1 Ionawr 2026", lastUpdatedTime: "12pm" },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([]));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSendDailyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderSendDailyHearingListData).toHaveBeenCalledWith([], expect.objectContaining({ locale: "cy" }));
    });
  });
});
