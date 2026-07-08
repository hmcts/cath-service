import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

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
  getPublicationJson: vi.fn(),
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    LIST_ASSIST: "List Assist"
  }
}));

vi.mock("@hmcts/administrative-court-daily-cause-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/administrative-court-daily-cause-list")>();
  return {
    ...actual,
    renderAdminCourt: vi.fn()
  };
});

import { renderAdminCourt } from "@hmcts/administrative-court-daily-cause-list";
import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

describe("Administrative Court page controller", () => {
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
    it("should render the list successfully for Birmingham", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "9001",
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        contentDate: new Date("2026-01-15"),
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10.30am",
          caseNumber: "CO/2026/000123",
          caseDetails: "R (Claimant) v Secretary of State",
          hearingType: "Judicial review",
          additionalInformation: "Listed for 1 day"
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Birmingham Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026 at 12pm"
        },
        hearings: [
          {
            venue: "Court 1",
            judge: "Mr Justice Smith",
            time: "10:30am",
            caseNumber: "CO/2026/000123",
            caseDetails: "R (Claimant) v Secretary of State",
            hearingType: "Judicial review",
            additionalInformation: "Listed for 1 day"
          }
        ]
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(getPublicationJson).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderAdminCourt).toHaveBeenCalledWith(mockJsonData, {
        locale: "en",
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        listTitle: expect.any(String),
        contentDate: mockArtefact.contentDate,
        lastReceivedDate: mockArtefact.lastReceivedDate.toISOString()
      });
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("administrative-court-daily-cause-list");
      expect(renderCall[1]).toMatchObject({
        header: mockRenderedData.header,
        hearings: mockRenderedData.hearings,
        dataSource: "Manual Upload"
      });
    });

    it("should render the list successfully for Leeds", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-456",
        listTypeId: 999,
        listTypeName: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData: object[] = [];
      const mockRenderedData = {
        header: {
          listTitle: "Leeds Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026 at 12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-456" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderAdminCourt).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          listTypeName: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
        })
      );
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("administrative-court-daily-cause-list");
    });

    it("should render the list successfully for Bristol/Cardiff", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-789",
        listTypeId: 999,
        listTypeName: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData: object[] = [];
      const mockRenderedData = {
        header: {
          listTitle: "Bristol and Cardiff Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026 at 12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-789" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderAdminCourt).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          listTypeName: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
        })
      );
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("administrative-court-daily-cause-list");
    });

    it("should render the list successfully for Manchester", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-012",
        listTypeId: 999,
        listTypeName: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData: object[] = [];
      const mockRenderedData = {
        header: {
          listTitle: "Manchester Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026 at 12pm"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-012" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderAdminCourt).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          listTypeName: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
        })
      );
      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("administrative-court-daily-cause-list");
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

      vi.mocked(getArtefactById).mockResolvedValue(null);

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

    it("should return 400 when list type name is not supported", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 1,
        listTypeName: "UNKNOWN_LIST_TYPE",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Invalid List Type",
          errorMessage: "This list type is not supported by this module"
        })
      );
    });

    it("should return 404 when JSON file is not found", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(null);

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
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [{ invalid: "data" }];

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({
        isValid: false,
        errors: ["Missing required field: venue"]
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

      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Error",
          errorMessage: "An error occurred while displaying the list"
        })
      );
    });

    it("should use Welsh locale when specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData: object[] = [];

      const mockRenderedData = {
        header: {
          listTitle: "Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham",
          listDate: "Rhestr ar gyfer 15 Ionawr 2026",
          lastUpdated: "Diweddarwyd ddiwethaf 14 Ionawr 2026"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderAdminCourt).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should default to English locale when locale is not specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData: object[] = [];

      const mockRenderedData = {
        header: {
          listTitle: "Birmingham Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = {};

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      expect(renderAdminCourt).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "en"
        })
      );
    });

    it("should use provenance label from PROVENANCE_LABELS", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "LIST_ASSIST"
      };

      const mockJsonData: object[] = [];

      const mockRenderedData = {
        header: {
          listTitle: "Birmingham Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[1]).toMatchObject({
        dataSource: "List Assist"
      });
    });

    it("should fall back to raw provenance if label not found", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        listTypeId: 999,
        listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        displayFrom: new Date("2026-01-15"),
        displayTo: new Date("2026-01-15"),
        lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
        provenance: "UNKNOWN_SOURCE"
      };

      const mockJsonData: object[] = [];

      const mockRenderedData = {
        header: {
          listTitle: "Birmingham Administrative Court Daily Cause List",
          listDate: "List for 15 January 2026",
          lastUpdated: "Last updated 14 January 2026"
        },
        hearings: []
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData as any);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[1]).toMatchObject({
        dataSource: "UNKNOWN_SOURCE"
      });
    });
  });
});
