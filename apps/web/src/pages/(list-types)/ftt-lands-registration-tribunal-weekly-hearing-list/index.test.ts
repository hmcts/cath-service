import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: () => mockValidate,
  provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" },
  provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist" }
}));

vi.mock("@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list", () => ({
  fttLrtWeeklyHearingListEn: {
    pageTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
    provenanceLabels: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist" }
  },
  fttLrtWeeklyHearingListCy: {
    pageTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
    provenanceLabels: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist" }
  },
  renderFttLrtData: vi.fn()
}));

import { renderFttLrtData } from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

const MOCK_ARTEFACT = {
  artefactId: "test-artefact-123",
  listTypeId: 32,
  contentDate: new Date("2026-01-01"),
  lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
  provenance: "MANUAL_UPLOAD"
};

const MOCK_JSON_DATA = [
  {
    date: "01/01/2026",
    hearingTime: "10:00am",
    caseName: "A Vs B",
    caseReferenceNumber: "LRT/00001/2026",
    judge: "Judge Smith",
    venuePlatform: "London"
  }
];

describe("FTT Land Registration Tribunal Weekly Hearing List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = { status: vi.fn().mockReturnThis(), render: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET handler", () => {
    it("should render the list successfully with valid data", async () => {
      // Arrange
      const mockRenderedData = {
        header: {
          listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
          weekCommencingDate: "1 January 2026",
          lastUpdatedDate: "1 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(MOCK_ARTEFACT as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderFttLrtData).mockReturnValue(mockRenderedData as any);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getPublicationJson).toHaveBeenCalledWith("test-artefact-123");
      expect(renderFttLrtData).toHaveBeenCalledWith(
        MOCK_JSON_DATA,
        expect.objectContaining({ courtName: "First-tier Tribunal (Land Registration Tribunal)" })
      );
      expect(res.render).toHaveBeenCalledWith("ftt-lands-registration-tribunal-weekly-hearing-list", expect.objectContaining({ dataSource: "Manual Upload" }));
    });

    it("should return 400 when artefactId is missing", async () => {
      req.query = {};
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Bad Request" }));
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "non-existent" };
      vi.mocked(getArtefactById).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 404 when blob is not found", async () => {
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(MOCK_ARTEFACT as any);
      vi.mocked(getPublicationJson).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on server error", async () => {
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Server Error" }));
    });

    it("should render in Welsh when locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      const mockRenderedData = {
        header: { listTitle: "title", weekCommencingDate: "", lastUpdatedDate: "", lastUpdatedTime: "" },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(MOCK_ARTEFACT as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderFttLrtData).mockReturnValue(mockRenderedData as any);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderFttLrtData).toHaveBeenCalledWith(MOCK_JSON_DATA, expect.objectContaining({ locale: "cy" }));
      expect(res.render).toHaveBeenCalledWith(
        "ftt-lands-registration-tribunal-weekly-hearing-list",
        expect.objectContaining({ dataSource: "Lanlwytho â Llaw" })
      );
    });
  });
});
