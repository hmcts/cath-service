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

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, allowedProvenance: "CFT_IDAM", isNonStrategic: true })
    }
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  canAccessPublicationData: vi.fn().mockReturnValue(true),
  resolveListType: vi.fn().mockResolvedValue({ id: 1, provenance: "CFT_IDAM", isNonStrategic: false }),
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    LIST_ASSIST: "List Assist"
  }
}));

vi.mock("@hmcts/interim-applications-daily-cause-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/interim-applications-daily-cause-list")>();
  return {
    ...actual,
    renderInterimApplicationsDailyCauseList: vi.fn()
  };
});

import { renderInterimApplicationsDailyCauseList } from "@hmcts/interim-applications-daily-cause-list";
import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

const baseArtefact = {
  artefactId: "test-artefact-123",
  locationId: "26",
  listTypeId: 999,
  listTypeName: "INTERIM_APPLICATIONS_DAILY_CAUSE_LIST",
  contentDate: new Date("2026-01-15"),
  displayFrom: new Date("2026-01-15"),
  displayTo: new Date("2026-01-15"),
  lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
  provenance: "MANUAL_UPLOAD"
};

const mockJsonData = {
  hearingList: [
    {
      judge: "Judge A",
      time: "10.30am",
      venue: "Venue A",
      type: "Type A",
      caseNumber: "1234",
      caseName: "Case name A",
      additionalInformation: "Info"
    }
  ],
  openJusticeStatementDetails: [{ nameToBeDisplayed: "Judge A", email: "a@justice.gov.uk" }]
};

const mockRenderedData = {
  header: {
    listTitle: "Interim Applications Daily Cause List",
    listDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12pm"
  },
  hearings: mockJsonData.hearingList,
  importantInfo: {
    editableParagraph: "Parties should contact the clerk to the Interim Judge Judge A, a@justice.gov.uk as early as possible.",
    staticParagraph: "An application should not be listed...",
    thirdParagraph: "Please note that hearings in the interim applications list will not additionally appear in their individual list."
  }
};

describe("Interim Applications Daily Cause List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  it("should render the list successfully with valid data including the important-info block", async () => {
    req.query = { artefactId: "test-artefact-123" };

    vi.mocked(getArtefactById).mockResolvedValue(baseArtefact as any);
    vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
    mockValidate.mockReturnValue({ isValid: true, errors: [] });
    vi.mocked(renderInterimApplicationsDailyCauseList).mockReturnValue(mockRenderedData as any);

    await GET(req as Request, res as Response);

    expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
    expect(renderInterimApplicationsDailyCauseList).toHaveBeenCalledWith(mockJsonData, {
      locale: "en",
      contentDate: baseArtefact.contentDate,
      lastReceivedDate: baseArtefact.lastReceivedDate.toISOString()
    });
    const renderCall = vi.mocked(res.render!).mock.calls[0]!;
    expect(renderCall[0]).toBe("interim-applications-daily-cause-list");
    expect(renderCall[1]).toMatchObject({
      header: mockRenderedData.header,
      hearings: mockRenderedData.hearings,
      importantInfo: mockRenderedData.importantInfo,
      dataSource: "Manual Upload"
    });
  });

  it("should return 400 when artefactId is missing", async () => {
    req.query = {};

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return 404 when artefact is not found", async () => {
    req.query = { artefactId: "non-existent" };
    vi.mocked(getArtefactById).mockResolvedValue(null);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should return 400 when list type name does not match", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue({ ...baseArtefact, listTypeName: "UNKNOWN_LIST_TYPE" } as any);

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

  it("should return 400 when JSON validation fails", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(baseArtefact as any);
    vi.mocked(getPublicationJson).mockResolvedValue({ invalid: "data" });
    mockValidate.mockReturnValue({ isValid: false, errors: ["Missing required field"] });

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

  it("should use the Welsh locale when specified", async () => {
    req.query = { artefactId: "test-artefact-123" };
    res.locals = { locale: "cy" };

    vi.mocked(getArtefactById).mockResolvedValue(baseArtefact as any);
    vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
    mockValidate.mockReturnValue({ isValid: true, errors: [] });
    vi.mocked(renderInterimApplicationsDailyCauseList).mockReturnValue(mockRenderedData as any);

    await GET(req as Request, res as Response);

    expect(renderInterimApplicationsDailyCauseList).toHaveBeenCalledWith(mockJsonData, expect.objectContaining({ locale: "cy" }));
  });

  it("should return 500 on server error", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockRejectedValue(new Error("DB failure"));

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
