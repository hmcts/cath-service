import { readFile } from "node:fs/promises";
import { prisma } from "@hmcts/postgres";
import { canAccessPublicationData, getArtefactById, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderCauseListData } from "../rendering/renderer.js";
import { validateCivilFamilyCauseList } from "../validation/json-validator.js";
import { GET } from "./index.js";

vi.mock("node:fs/promises");
vi.mock("@hmcts/postgres", () => ({
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
    canAccessPublicationData: vi.fn()
  };
});
vi.mock("../validation/json-validator.js");
vi.mock("../rendering/renderer.js");

describe("civil-and-family-daily-cause-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const mockListType = {
    id: 8,
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
    // Default mock for listType - tests can override if needed
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

    it("should return 404 when JSON file cannot be read", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 8,
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
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

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
        listTypeId: 8,
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
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ invalid: "data" }));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: false,
        errors: ["Validation error"]
      } as any);

      await GET(req as Request, res as Response);

      expect(validateCivilFamilyCauseList).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Validation errors:", ["Validation error"]);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should successfully render cause list with valid data in English", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "en" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 8,
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
        document: {
          publicationDate: "2025-01-13"
        },
        venue: {
          venueAddress: {
            line: ["Court Address"]
          }
        },
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      } as any);
      vi.mocked(renderCauseListData).mockResolvedValue({
        document: { locationName: "Test Court", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025" },
        venue: { venueName: "Test Court", email: "test@example.com", phone: "123456" },
        courtLists: []
      } as any);

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: "1",
        contentDate: mockArtefact.contentDate,
        locale: "en"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("civil-and-family-daily-cause-list");
      expect(renderCall[1]).toMatchObject({
        dataSource: "Manual Upload"
      });
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
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 8,
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
        document: {
          publicationDate: "2025-01-13"
        },
        venue: {
          venueAddress: {
            line: ["Cyfeiriad y Llys"]
          }
        },
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      } as any);
      vi.mocked(renderCauseListData).mockResolvedValue({
        document: { locationName: "Llys Prawf", addressLines: [], contentDate: "13 Ionawr 2025", lastUpdated: "13 Ionawr 2025" },
        venue: { venueName: "Llys Prawf", email: "prawf@example.com", phone: "123456" },
        courtLists: []
      } as any);

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: "1",
        contentDate: mockArtefact.contentDate,
        locale: "cy"
      });
      expect(res.render).toHaveBeenCalledWith("civil-and-family-daily-cause-list", expect.any(Object));
    });

    it("should default to English when locale is not set", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = {};
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 8,
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
        document: {
          publicationDate: "2025-01-13"
        },
        venue: {
          venueAddress: {
            line: ["Court Address"]
          }
        },
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      } as any);
      vi.mocked(renderCauseListData).mockResolvedValue({
        document: { locationName: "Test Court", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025" },
        venue: { venueName: "Test Court", email: "test@example.com", phone: "123456" },
        courtLists: []
      } as any);

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

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error rendering cause list:", expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should use provenance label for data source", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: "1",
        listTypeId: 8,
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
        document: {
          publicationDate: "2025-01-13"
        },
        venue: {
          venueAddress: {
            line: ["Court Address"]
          }
        },
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      } as any);
      vi.mocked(renderCauseListData).mockResolvedValue({
        document: { locationName: "Test Court", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025" },
        venue: { venueName: "Test Court", email: "test@example.com", phone: "123456" },
        courtLists: []
      } as any);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "civil-and-family-daily-cause-list",
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
        listTypeId: 8,
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
        document: {
          publicationDate: "2025-01-13"
        },
        venue: {
          venueAddress: {
            line: ["Court Address"]
          }
        },
        courtLists: []
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      } as any);
      vi.mocked(renderCauseListData).mockResolvedValue({
        document: { locationName: "Test Court", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025" },
        venue: { venueName: "Test Court", email: "test@example.com", phone: "123456" },
        courtLists: []
      } as any);

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "civil-and-family-daily-cause-list",
        expect.objectContaining({
          dataSource: "UNKNOWN_PROVENANCE"
        })
      );
    });
  });
});
