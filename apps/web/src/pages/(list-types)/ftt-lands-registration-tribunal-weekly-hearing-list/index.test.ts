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
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload", LIST_ASSIST: "List Assist" }
}));

vi.mock("@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list")>();
  return { ...actual, renderFttLrtData: vi.fn() };
});

import { renderFttLrtData } from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import { getArtefactById } from "@hmcts/publication";
import { GET } from "./index.js";

describe("FTT Lands Registration Tribunal Weekly Hearing List page controller", () => {
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
      const mockArtefact = {
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };
      const mockJsonData = [
        {
          date: "01/01/2026",
          hearingTime: "10:00am",
          caseName: "A Vs B",
          caseReferenceNumber: "LRT/00001/2026",
          judge: "Judge Smith",
          venuePlatform: "London"
        }
      ];
      const mockRenderedData = {
        header: {
          listTitle: "First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List",
          weekCommencingDate: "1 January 2026",
          lastUpdatedDate: "1 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderFttLrtData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(renderFttLrtData).toHaveBeenCalledWith(mockJsonData, expect.objectContaining({ courtName: "First-tier Tribunal (Lands Registration Tribunal)" }));
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("ftt-lands-registration-tribunal-weekly-hearing-list");
      expect(renderCall[1]).toMatchObject({ dataSource: "Manual Upload" });
    });

    it("should return 400 when artefactId is missing", async () => {
      req.query = {};
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "non-existent" };
      vi.mocked(getArtefactById).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 404 when JSON file is not found", async () => {
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on server error", async () => {
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
