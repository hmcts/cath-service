import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@hmcts/magistrates-adult-court-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/magistrates-adult-court-list")>();
  return {
    ...actual,
    validateMagistratesAdultCourtList: vi.fn(),
    renderMagistratesAdultCourtList: vi.fn()
  };
});

import { renderMagistratesAdultCourtList, validateMagistratesAdultCourtList } from "@hmcts/magistrates-adult-court-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

const LIST_TYPE_CASES = [
  { listTypeName: "MAGISTRATES_ADULT_COURT_LIST_DAILY", listTypeId: 57 },
  { listTypeName: "MAGISTRATES_ADULT_COURT_LIST_FUTURE", listTypeId: 58 }
];

describe("magistrates-adult-court-list controller", () => {
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
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 57, allowedProvenance: ["CRIME_IDAM"], isNonStrategic: false } as any);
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
      vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id", "MAGISTRATES_ADULT_COURT_LIST_DAILY", 57));
      vi.mocked(canAccessPublicationData).mockReturnValue(false);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
    });

    it("should return 404 when JSON blob is not found", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id", "MAGISTRATES_ADULT_COURT_LIST_DAILY", 57));
      vi.mocked(getPublicationJson).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 400 when JSON validation fails", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id", "MAGISTRATES_ADULT_COURT_LIST_DAILY", 57));
      vi.mocked(getPublicationJson).mockResolvedValue({ invalid: "data" });
      vi.mocked(validateMagistratesAdultCourtList).mockReturnValue({ isValid: false, errors: ["Validation error"], schemaVersion: "1.0" } as any);
      await GET(req as Request, res as Response);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[magistrates-adult-court-list] Validation errors:", ["Validation error"]);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 500 on unexpected error", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));
      await GET(req as Request, res as Response);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[magistrates-adult-court-list] Unexpected error:", expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    for (const { listTypeName, listTypeId } of LIST_TYPE_CASES) {
      it(`should render ${listTypeName} with valid data`, async () => {
        req.query = { artefactId: "test-id" };
        res.locals = { locale: "en" };
        const mockJsonData = buildMockJsonData();
        const mockRenderedData = buildMockRenderedData();
        vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: listTypeId, allowedProvenance: ["CRIME_IDAM"], isNonStrategic: false } as any);
        vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id", listTypeName, listTypeId));
        vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
        vi.mocked(validateMagistratesAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
        vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(mockRenderedData as any);

        await GET(req as Request, res as Response);

        expect(renderMagistratesAdultCourtList).toHaveBeenCalledWith(mockJsonData, {
          locale: "en",
          locationId: "1",
          contentDate: expect.any(Date)
        });
        const renderCall = vi.mocked(res.render!).mock.calls[0]!;
        expect(renderCall[0]).toBe("magistrates-adult-court-list/index");
        expect(renderCall[1]).toHaveProperty("en");
        expect(renderCall[1]).toHaveProperty("cy");
        expect(renderCall[1]).toHaveProperty("header");
        expect(renderCall[1]).toHaveProperty("listData");
        expect(renderCall[1]).toHaveProperty("t");
      });
    }

    it("should render with Welsh locale", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "cy" };
      vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id", "MAGISTRATES_ADULT_COURT_LIST_DAILY", 57));
      vi.mocked(getPublicationJson).mockResolvedValue(buildMockJsonData());
      vi.mocked(validateMagistratesAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(buildMockRenderedData() as any);

      await GET(req as Request, res as Response);

      expect(renderMagistratesAdultCourtList).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ locale: "cy" }));
      expect(res.render).toHaveBeenCalledWith("magistrates-adult-court-list/index", expect.any(Object));
    });
  });
});

function buildMockArtefact(artefactId: string, listTypeName: string, listTypeId: number) {
  return {
    artefactId,
    locationId: "1",
    listTypeId,
    listTypeName,
    contentDate: new Date("2025-01-13"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2025-01-13"),
    displayTo: new Date("2025-01-20"),
    lastReceivedDate: new Date("2025-01-13"),
    isFlatFile: false,
    provenance: "CRIME_IDAM",
    supersededCount: 0,
    noMatch: false
  } as any;
}

function buildMockJsonData() {
  return {
    document: { publicationDate: "2025-01-13T09:30:00.000Z" },
    venue: { venueAddress: { line: ["Court Address"], postCode: "AB1 2CD" } },
    courtLists: []
  };
}

function buildMockRenderedData() {
  return {
    header: {
      locationName: "Test Court",
      contentDate: "13 January 2025",
      publishedDate: "13 January 2025",
      publishedTime: "9:30am",
      venueAddress: ["Court Address"]
    },
    openJustice: null,
    listData: { courtLists: [] }
  };
}
