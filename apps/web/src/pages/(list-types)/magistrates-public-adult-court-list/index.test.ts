import { renderMagistratesPublicAdultCourtListData, validateMagistratesPublicAdultCourtList } from "@hmcts/magistrates-public-adult-court-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, getPublicationJson } from "@hmcts/publication";
import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: { findUnique: vi.fn() },
    listType: { findUnique: vi.fn() }
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

vi.mock("@hmcts/magistrates-public-adult-court-list");

describe("magistrates-public-adult-court-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const mockListType = {
    id: 57,
    allowedProvenance: ["CRIME_IDAM"],
    isNonStrategic: false
  };

  const mockArtefact = {
    artefactId: "test-id",
    locationId: "240",
    listTypeId: 57,
    contentDate: new Date("2025-09-13"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2025-09-13"),
    displayTo: new Date("2025-09-20"),
    lastReceivedDate: new Date("2025-09-13"),
    isFlatFile: false,
    provenance: "CRIME_IDAM",
    supersededCount: 0,
    noMatch: false
  } as any;

  const mockJsonData = {
    document: {
      info: { start_time: "09:00:00" },
      data: {
        job: {
          printdate: "13/09/2025",
          sessions: { session: [] }
        }
      }
    }
  };

  const mockRenderedData = {
    header: {
      locationName: "Manchester Crown Court",
      contentDate: "13 September 2025",
      publishedDate: "13 September 2025",
      publishedTime: "9am"
    },
    listData: []
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
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("GET", () => {
    it("should return 400 when artefactId is missing", async () => {
      req.query = {};

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: expect.any(String), errorMessage: expect.any(String) }));
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "nonexistent-id" };
      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("nonexistent-id");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 403 when access is denied", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
    });

    it("should return 404 when JSON blob is not found", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 400 when JSON validation fails", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue({ invalid: "data" });
      vi.mocked(validateMagistratesPublicAdultCourtList).mockReturnValue({
        isValid: false,
        errors: ["Validation error"],
        schemaVersion: "1.0"
      } as any);

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[magistrates-public-adult-court-list] Validation errors:", ["Validation error"]);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 500 on unexpected error", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[magistrates-public-adult-court-list] Unexpected error:", expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should render the shared template with valid English data", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "en" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesPublicAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderMagistratesPublicAdultCourtListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        locationId: "240",
        contentDate: mockArtefact.contentDate
      });
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("magistrates-public-adult-court-list");
      expect(renderCall[1]).toHaveProperty("en");
      expect(renderCall[1]).toHaveProperty("cy");
      expect(renderCall[1]).toHaveProperty("header");
      expect(renderCall[1]).toHaveProperty("listData");
      expect(renderCall[1]).toHaveProperty("t");
    });

    it("should render title using heading locale key and location name", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesPublicAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[1].title).toBe("Magistrates Public List for Manchester Crown Court");
    });

    it("should render with Welsh locale", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "cy" };
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, language: "WELSH" });
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesPublicAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderMagistratesPublicAdultCourtListData).toHaveBeenCalledWith(mockJsonData, expect.objectContaining({ locale: "cy" }));
      expect(res.render).toHaveBeenCalledWith("magistrates-public-adult-court-list", expect.any(Object));
    });

    it("should use raw provenance as data source when no label exists", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesPublicAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith("magistrates-public-adult-court-list", expect.objectContaining({ dataSource: "CRIME_IDAM" }));
    });

    it("should use labelled provenance as data source when label exists", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, provenance: "MANUAL_UPLOAD" });
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesPublicAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith("magistrates-public-adult-court-list", expect.objectContaining({ dataSource: "Manual Upload" }));
    });
  });
});
