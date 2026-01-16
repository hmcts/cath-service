import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: () => mockValidate
}));

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("../rendering/renderer.js", () => ({
  renderCareStandardsTribunalData: vi.fn()
}));

import { prisma } from "@hmcts/postgres";
import { renderCareStandardsTribunalData } from "../rendering/renderer.js";
import { GET } from "./index.js";

describe("Care Standards Tribunal page controller", () => {
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
        locationId: "9001",
        listTypeId: 9,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-07"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          date: "01/01/2026",
          caseName: "Test Case A vs B",
          hearingLength: "1 hour",
          hearingType: "Substantive hearing",
          venue: "Care Standards Tribunal",
          additionalInformation: "Remote hearing"
        }
      ];

      const mockRenderedData = {
        header: {
          title: "Care Standards Tribunal Weekly Hearing List",
          duration: "Week commencing 1 January 2026",
          lastUpdated: "Last updated: 1 January 2026"
        },
        hearings: [
          {
            date: "1 January 2026",
            caseName: "Test Case A vs B",
            hearingLength: "1 hour",
            hearingType: "Substantive hearing",
            venue: "Care Standards Tribunal",
            additionalInformation: "Remote hearing"
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCareStandardsTribunalData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId: "test-artefact-123" }
      });
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderCareStandardsTribunalData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Care Standards Tribunal",
        displayFrom: mockArtefact.displayFrom,
        displayTo: mockArtefact.displayTo,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Care Standards Tribunal Weekly Hearing List"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("care-standards-tribunal-weekly-hearing-list");
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

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

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
        locationId: "9001",
        listTypeId: 9,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-07"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

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

    it("should return 400 when JSON validation fails", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 9,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-07"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          date: "invalid-date",
          caseName: "Test Case",
          hearingLength: "1 hour",
          hearingType: "Substantive hearing",
          venue: "Care Standards Tribunal",
          additionalInformation: "Remote hearing"
        }
      ];

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({
        isValid: false,
        errors: ["Invalid date format"]
      });

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Invalid Data",
          errorMessage: "The list data is invalid"
        })
      );
    });

    it("should return 500 on server error", async () => {
      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(prisma.artefact.findUnique).mockRejectedValue(new Error("Database connection failed"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Server Error",
          errorMessage: "An error occurred while loading the list"
        })
      );
    });

    it("should use Welsh locale when specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 9,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-07"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          date: "01/01/2026",
          caseName: "Test Case",
          hearingLength: "1 hour",
          hearingType: "Substantive hearing",
          venue: "Care Standards Tribunal",
          additionalInformation: "Remote hearing"
        }
      ];

      const mockRenderedData = {
        header: {
          title: "Welsh placeholder",
          duration: "Week commencing 1 January 2026",
          lastUpdated: "Last updated: 1 January 2026"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderCareStandardsTribunalData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderCareStandardsTribunalData).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "cy"
        })
      );
    });
  });
});
