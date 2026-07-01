import { renderMagistratesStandardListData, validateMagistratesStandardList } from "@hmcts/magistrates-standard-list";
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
vi.mock("@hmcts/magistrates-standard-list");

describe("magistrates-standard-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const mockListType = {
    id: 28,
    allowedProvenance: ["MANUAL_UPLOAD"],
    isNonStrategic: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {}
    };
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

      expect(getArtefactById).toHaveBeenCalledWith("nonexistent-id");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 403 when access is denied", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
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
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
    });

    it("should return 404 when JSON blob is not found", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
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
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 400 when JSON validation fails", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
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
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue({ invalid: "data" });
      vi.mocked(validateMagistratesStandardList).mockReturnValue({
        isValid: false,
        errors: ["Validation error"],
        schemaVersion: "1.0"
      } as any);

      await GET(req as Request, res as Response);

      expect(validateMagistratesStandardList).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[magistrates-standard-list] Validation errors:", ["Validation error"]);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should successfully render with valid data in English", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "en" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
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
        document: { publicationDate: "2025-01-13T09:30:00.000Z" },
        venue: { venueAddress: { line: ["Court Address"] } },
        courtLists: []
      };
      const mockRenderedData = {
        header: {
          contentDate: "13 January 2025",
          publishedDate: "13 January 2025",
          publishedTime: "09:30",
          venueAddress: "Court Address"
        },
        listData: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesStandardList).mockReturnValue({
        isValid: true,
        errors: [],
        schemaVersion: "1.0"
      } as any);
      vi.mocked(renderMagistratesStandardListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderMagistratesStandardListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        locationId: "1",
        contentDate: mockArtefact.contentDate
      });
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("magistrates-standard-list");
      expect(renderCall[1]).toMatchObject({
        dataSource: "Manual Upload"
      });
      expect(renderCall[1]).toHaveProperty("en");
      expect(renderCall[1]).toHaveProperty("cy");
      expect(renderCall[1]).toHaveProperty("header");
      expect(renderCall[1]).toHaveProperty("listData");
      expect(renderCall[1]).toHaveProperty("t");
    });

    it("should successfully render with Welsh locale", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "cy" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
        contentDate: new Date("2025-01-13"),
        sensitivity: "PUBLIC",
        language: "WELSH",
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        lastReceivedDate: new Date("2025-01-13"),
        isFlatFile: false,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      } as any;
      const mockJsonData = {
        document: { publicationDate: "2025-01-13T09:30:00.000Z" },
        venue: { venueAddress: { line: ["Cyfeiriad y Llys"] } },
        courtLists: []
      };
      const mockRenderedData = {
        header: {
          contentDate: "13 Ionawr 2025",
          publishedDate: "13 Ionawr 2025",
          publishedTime: "09:30",
          venueAddress: "Cyfeiriad y Llys"
        },
        listData: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesStandardList).mockReturnValue({
        isValid: true,
        errors: [],
        schemaVersion: "1.0"
      } as any);
      vi.mocked(renderMagistratesStandardListData).mockResolvedValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderMagistratesStandardListData).toHaveBeenCalledWith(mockJsonData, {
        locale: "cy",
        locationId: "1",
        contentDate: mockArtefact.contentDate
      });
      expect(res.render).toHaveBeenCalledWith("magistrates-standard-list", expect.any(Object));
    });

    it("should return 500 on unexpected error", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[magistrates-standard-list] Unexpected error:", expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should use provenance label for data source", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
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
        document: { publicationDate: "2025-01-13T09:30:00.000Z" },
        venue: { venueAddress: { line: ["Court Address"] } },
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesStandardList).mockReturnValue({
        isValid: true,
        errors: [],
        schemaVersion: "1.0"
      } as any);
      vi.mocked(renderMagistratesStandardListData).mockReturnValue({
        header: { contentDate: "13 January 2025", publishedDate: "13 January 2025", publishedTime: "09:30", venueAddress: "" },
        listData: []
      } as any);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "magistrates-standard-list",
        expect.objectContaining({
          dataSource: "Manual Upload"
        })
      );
    });

    it("should use raw provenance when label not found", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 28,
        contentDate: new Date("2025-01-13"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        lastReceivedDate: new Date("2025-01-13"),
        isFlatFile: false,
        provenance: "UNKNOWN_PROVENANCE",
        supersededCount: 0,
        noMatch: false
      } as any;
      const mockJsonData = {
        document: { publicationDate: "2025-01-13T09:30:00.000Z" },
        venue: {},
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      vi.mocked(validateMagistratesStandardList).mockReturnValue({
        isValid: true,
        errors: [],
        schemaVersion: "1.0"
      } as any);
      vi.mocked(renderMagistratesStandardListData).mockReturnValue({
        header: { contentDate: "13 January 2025", publishedDate: "13 January 2025", publishedTime: "09:30", venueAddress: "" },
        listData: []
      } as any);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "magistrates-standard-list",
        expect.objectContaining({
          dataSource: "UNKNOWN_PROVENANCE"
        })
      );
    });
  });
});
