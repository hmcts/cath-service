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
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    LIST_ASSIST: "List Assist"
  }
}));

vi.mock("@hmcts/siac-poac-paac-weekly-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/siac-poac-paac-weekly-hearing-list")>();
  return {
    ...actual,
    renderSiacPoacPaacData: vi.fn()
  };
});

import { getArtefactById } from "@hmcts/publication";
import { renderSiacPoacPaacData } from "@hmcts/siac-poac-paac-weekly-hearing-list";
import { GET } from "./index.js";

describe("SIAC Weekly Hearing List page controller", () => {
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
      // Arrange
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 28,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-07"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          date: "01/01/2026",
          time: "10:00am",
          appellant: "Smith v Secretary of State",
          caseReferenceNumber: "SC/00001/2026",
          hearingType: "Substantive hearing",
          courtroom: "Court 1",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Special Immigration Appeals Commission Weekly Hearing List",
          weekCommencingDate: "1 January 2026",
          lastUpdatedDate: "1 January 2026",
          lastUpdatedTime: "12pm"
        },
        hearings: [
          {
            date: "1 January 2026",
            time: "10:00am",
            appellant: "Smith v Secretary of State",
            caseReferenceNumber: "SC/00001/2026",
            hearingType: "Substantive hearing",
            courtroom: "Court 1",
            additionalInformation: ""
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSiacPoacPaacData).mockReturnValue(mockRenderedData);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(renderSiacPoacPaacData).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        courtName: "Special Immigration Appeals Commission",
        contentDate: mockArtefact.contentDate,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString(),
        listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
      });
      const renderCall = vi.mocked(res.render).mock.calls[0];
      expect(renderCall[0]).toBe("siac-weekly-hearing-list");
      expect(renderCall[1]).toMatchObject({
        header: mockRenderedData.header,
        hearings: mockRenderedData.hearings,
        dataSource: "Manual Upload"
      });
    });

    it("should return 400 when artefactId is missing", async () => {
      // Arrange
      req.query = {};

      // Act
      await GET(req as Request, res as Response);

      // Assert
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
      // Arrange
      req.query = { artefactId: "non-existent" };
      vi.mocked(getArtefactById).mockResolvedValue(null);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Not Found"
        })
      );
    });

    it("should return 404 when JSON file is not found", async () => {
      // Arrange
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 when JSON validation fails", async () => {
      // Arrange
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ date: "invalid" }]));
      mockValidate.mockReturnValue({ isValid: false, errors: ["Invalid date format"] });

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on server error", async () => {
      // Arrange
      req.query = { artefactId: "test-artefact-123" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
