import { renderCauseListData, validateCopDailyCauseList } from "@hmcts/cop-daily-cause-list";
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
vi.mock("@hmcts/cop-daily-cause-list");

const mockArtefact = {
  artefactId: "test-id",
  locationId: "1",
  listTypeId: 999,
  contentDate: new Date("2025-01-13"),
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  displayFrom: new Date("2025-01-13"),
  displayTo: new Date("2025-01-20"),
  lastReceivedDate: new Date("2025-01-13"),
  isFlatFile: false,
  provenance: "MANUAL_UPLOAD",
  supersededCount: 0,
  noMatch: false
} as any;

const mockJsonData = {
  document: { publicationDate: "2025-01-13" },
  venue: { venueAddress: { line: ["Court Address"] } },
  courtLists: []
};

const mockRenderedData = {
  header: { locationName: "Test Court", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025" },
  openJustice: { venueName: "Test Court", email: "test@example.com", phone: "123456" },
  listData: { courtLists: [] }
} as any;

describe("cop-daily-cause-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = {
      locals: { locale: "en" },
      status: vi.fn().mockReturnThis(),
      render: vi.fn()
    };
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 999, allowedProvenance: ["MANUAL_UPLOAD"], isNonStrategic: false } as any);
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
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "nonexistent-id" };
      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("nonexistent-id");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 404 when JSON file cannot be read", async () => {
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
      vi.mocked(validateCopDailyCauseList).mockReturnValue({ isValid: false, errors: ["Validation error"] } as any);

      await GET(req as Request, res as Response);

      expect(validateCopDailyCauseList).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[cop-daily-cause-list] Validation errors:", ["Validation error"]);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should successfully render cause list with valid data in English", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "en" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateCopDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
      vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: "1",
        contentDate: mockArtefact.contentDate,
        locale: "en"
      });
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("cop-daily-cause-list");
      expect(renderCall[1]).toMatchObject({ dataSource: "Manual Upload" });
      expect(renderCall[1]).toHaveProperty("en");
      expect(renderCall[1]).toHaveProperty("cy");
      expect(renderCall[1]).toHaveProperty("header");
      expect(renderCall[1]).toHaveProperty("openJustice");
      expect(renderCall[1]).toHaveProperty("listData");
      expect(renderCall[1]).toHaveProperty("t");
    });

    it("should successfully render cause list with Welsh locale", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "cy" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateCopDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
      vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: "1",
        contentDate: mockArtefact.contentDate,
        locale: "cy"
      });
      expect(res.render).toHaveBeenCalledWith("cop-daily-cause-list", expect.any(Object));
    });

    it("should default to English when locale is not set", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = {};
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateCopDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
      vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: "1",
        contentDate: mockArtefact.contentDate,
        locale: "en"
      });
    });

    it("should return 500 when an unexpected error occurs", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[cop-daily-cause-list] Unexpected error:", expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should use raw provenance when label not found", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, provenance: "UNKNOWN_PROVENANCE" });
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateCopDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
      vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith("cop-daily-cause-list", expect.objectContaining({ dataSource: "UNKNOWN_PROVENANCE" }));
    });
  });
});
