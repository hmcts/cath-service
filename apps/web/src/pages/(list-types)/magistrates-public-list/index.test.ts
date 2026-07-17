import { renderMagistratesPublicListData, validateMagistratesPublicList } from "@hmcts/magistrates-public-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, getPublicationJson } from "@hmcts/publication";
import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    },
    listType: {
      findUnique: vi.fn()
    }
  }
}));
vi.mock("@hmcts/publication", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/publication")>();
  return {
    ...actual,
    getArtefactById: vi.fn(),
    getPublicationJson: vi.fn(),
    canAccessPublicationData: vi.fn()
  };
});
vi.mock("@hmcts/magistrates-public-list");

describe("magistrates-public-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const mockListType = {
    id: 1,
    allowedProvenance: ["MANUAL_UPLOAD"],
    isNonStrategic: false
  };

  const baseArtefact = {
    artefactId: "test-id",
    locationId: "1",
    listTypeId: 1,
    contentDate: new Date("2025-01-13"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2025-01-13"),
    displayTo: new Date("2025-01-20"),
    lastReceivedDate: new Date("2025-01-13"),
    isFlatFile: false,
    provenance: "MANUAL_UPLOAD",
    supersededCount: 0,
    noMatch: false,
    excelPath: null
  };

  const mockJsonData = {
    document: { publicationDate: "2025-01-13T09:30:00.000Z" },
    venue: { venueAddress: { line: ["Court Address"] } },
    courtLists: []
  };

  const mockRenderedData = {
    header: {
      locationName: "Test Court",
      contentDate: "13 January 2025",
      publishedDate: "13 January 2025",
      publishedTime: "09:30",
      venueAddress: []
    },
    openJustice: null,
    listData: mockJsonData
  };

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = {
      locals: { locale: "en" },
      status: vi.fn().mockReturnThis(),
      render: vi.fn()
    };
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(validateMagistratesPublicList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(mockRenderedData as any);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("GET", () => {
    it("should return 400 when artefactId is missing", async () => {
      req.query = {};

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: expect.any(String),
          errorMessage: expect.any(String)
        })
      );
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "nonexistent-id" };
      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 403 when access is denied", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(baseArtefact as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
    });

    it("should return 404 when JSON blob is not found", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(baseArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should render successfully when artefact has no excelPath", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({ ...baseArtefact, excelPath: null } as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("magistrates-public-list");
      expect(renderCall[1]).toMatchObject({
        excelDownloadUrl: undefined,
        pdfDownloadUrl: "/api/flat-file/test-id/download"
      });
    });

    it("should pass excelDownloadUrl when artefact has excelPath", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({ ...baseArtefact, excelPath: "test-id.xlsx" } as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("magistrates-public-list");
      expect(renderCall[1]).toMatchObject({
        excelDownloadUrl: "/api/flat-file/test-id/download?format=excel",
        pdfDownloadUrl: "/api/flat-file/test-id/download"
      });
    });

    it("should return 500 on unexpected error", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });
  });
});
