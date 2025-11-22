import { readFile } from "node:fs/promises";
import { prisma } from "@hmcts/postgres";
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
    }
  }
}));
vi.mock("../validation/json-validator.js");
vi.mock("../rendering/renderer.js");

describe("civil-and-family-daily-cause-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId: "nonexistent-id" }
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should return 404 when JSON file cannot be read", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
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
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ invalid: "data" }));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: false,
        errors: ["Validation error"]
      });

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
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      });
      vi.mocked(renderCauseListData).mockResolvedValue({
        header: { title: "Test Court", publishedDate: "13 January 2025" },
        openJustice: { statement: "Test statement" },
        listData: []
      });

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: 1,
        contentDate: mockArtefact.contentDate,
        locale: "en"
      });
      expect(res.render).toHaveBeenCalledWith(
        "civil-and-family-daily-cause-list",
        expect.objectContaining({
          header: expect.any(Object),
          openJustice: expect.any(Object),
          listData: expect.any(Array),
          dataSource: "Manual Upload"
        })
      );
    });

    it("should successfully render cause list with Welsh locale", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "cy" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      });
      vi.mocked(renderCauseListData).mockResolvedValue({
        header: { title: "Llys Prawf", publishedDate: "13 Ionawr 2025" },
        openJustice: { statement: "Datganiad prawf" },
        listData: []
      });

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: 1,
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
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      });
      vi.mocked(renderCauseListData).mockResolvedValue({
        header: { title: "Test Court", publishedDate: "13 January 2025" },
        openJustice: { statement: "Test statement" },
        listData: []
      });

      await GET(req as Request, res as Response);

      expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
        locationId: 1,
        contentDate: mockArtefact.contentDate,
        locale: "en"
      });
    });

    it("should return 500 when an unexpected error occurs", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(prisma.artefact.findUnique).mockRejectedValue(new Error("Database error"));

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error rendering cause list:", expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
    });

    it("should use provenance label for data source", async () => {
      req.query = { artefactId: "test-id" };
      const mockArtefact = {
        artefactId: "test-id",
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      });
      vi.mocked(renderCauseListData).mockResolvedValue({
        header: { title: "Test Court", publishedDate: "13 January 2025" },
        openJustice: { statement: "Test statement" },
        listData: []
      });

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
        locationId: 1,
        listTypeId: 8,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "UNKNOWN_PROVENANCE",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateCivilFamilyCauseList).mockReturnValue({
        isValid: true,
        errors: []
      });
      vi.mocked(renderCauseListData).mockResolvedValue({
        header: { title: "Test Court", publishedDate: "13 January 2025" },
        openJustice: { statement: "Test statement" },
        listData: []
      });

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
