import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    createJsonValidator: () => mockValidate
  };
});

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  canAccessPublicationData: vi.fn().mockReturnValue(true),
  resolveListType: vi.fn().mockResolvedValue({ id: 1, provenance: "CFT_IDAM", isNonStrategic: false }),
  PROVENANCE_LABELS: {
    CFT_IDAM: "Court and tribunal hearings service"
  }
}));

vi.mock("@hmcts/iac-daily-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/iac-daily-list")>();
  return {
    ...actual,
    renderIacDailyList: vi.fn()
  };
});

import { renderIacDailyList } from "@hmcts/iac-daily-list";
import { canAccessPublicationData, getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

const RENDERED_DATA = {
  header: {
    listTitle: "Immigration and Asylum Chamber Daily List",
    venueName: "Manchester",
    contentDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12pm"
  },
  hearings: { courtLists: [] }
};

function buildArtefact(overrides: Record<string, unknown> = {}) {
  return {
    artefactId: "test-artefact-123",
    locationId: "9001",
    // Arbitrary numeric id — routing must be driven by listTypeName, not this value.
    listTypeId: 999,
    listTypeName: "IAC_DAILY_LIST",
    contentDate: new Date("2026-01-15"),
    displayFrom: new Date("2026-01-15"),
    displayTo: new Date("2026-01-15"),
    lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
    provenance: "CFT_IDAM",
    ...overrides
  };
}

describe("IAC Daily List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      setHeader: vi.fn(),
      locals: { locale: "en" }
    };
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(renderIacDailyList).mockReturnValue(RENDERED_DATA as never);
  });

  it("should render the IAC Daily List successfully", async () => {
    req.query = { artefactId: "test-artefact-123" };
    const jsonData = { document: {}, venue: {}, courtLists: [] };

    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact() as never);
    vi.mocked(getPublicationJson).mockResolvedValue(jsonData);
    mockValidate.mockReturnValue({ isValid: true, errors: [] });

    await GET(req as Request, res as Response);

    expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
    expect(mockValidate).toHaveBeenCalledWith(jsonData);
    expect(renderIacDailyList).toHaveBeenCalledWith(jsonData, expect.objectContaining({ locale: "en", listTypeName: "IAC_DAILY_LIST" }));
    const renderCall = vi.mocked(res.render!).mock.calls[0]!;
    expect(renderCall[0]).toBe("iac-daily-list");
    expect(renderCall[1]).toMatchObject({
      header: RENDERED_DATA.header,
      hearings: RENDERED_DATA.hearings,
      listTypeName: "IAC_DAILY_LIST"
    });
  });

  it("should route to the additional cases template based on listTypeName", async () => {
    req.query = { artefactId: "test-artefact-123" };
    const jsonData = { document: {}, venue: {}, courtLists: [] };

    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact({ listTypeName: "IAC_DAILY_LIST_ADDITIONAL_CASES" }) as never);
    vi.mocked(getPublicationJson).mockResolvedValue(jsonData);
    mockValidate.mockReturnValue({ isValid: true, errors: [] });

    await GET(req as Request, res as Response);

    expect(renderIacDailyList).toHaveBeenCalledWith(jsonData, expect.objectContaining({ listTypeName: "IAC_DAILY_LIST_ADDITIONAL_CASES" }));
    const renderCall = vi.mocked(res.render!).mock.calls[0]!;
    expect(renderCall[0]).toBe("iac-daily-list-additional-cases");
  });

  it("should return 400 when artefactId is missing", async () => {
    req.query = {};

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Bad Request" }));
  });

  it("should return 404 when artefact is not found", async () => {
    req.query = { artefactId: "missing" };
    vi.mocked(getArtefactById).mockResolvedValue(null);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Not Found" }));
  });

  it("should return 403 when the user cannot access the publication", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact() as never);
    vi.mocked(canAccessPublicationData).mockReturnValue(false);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should return 400 when the list type name is not supported", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact({ listTypeName: "UNKNOWN_LIST_TYPE" }) as never);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Invalid List Type" }));
  });

  it("should return 404 when the JSON blob is not found", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact() as never);
    vi.mocked(getPublicationJson).mockResolvedValue(null);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Not Found" }));
  });

  it("should return 400 when JSON validation fails", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact() as never);
    vi.mocked(getPublicationJson).mockResolvedValue({ invalid: "data" });
    mockValidate.mockReturnValue({ isValid: false, errors: ["missing field"] });

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Invalid Data" }));
  });

  it("should return 500 on unexpected server error", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should use the Welsh locale when specified", async () => {
    req.query = { artefactId: "test-artefact-123" };
    res.locals = { locale: "cy" };
    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact() as never);
    vi.mocked(getPublicationJson).mockResolvedValue({ document: {}, venue: {}, courtLists: [] });
    mockValidate.mockReturnValue({ isValid: true, errors: [] });

    await GET(req as Request, res as Response);

    expect(renderIacDailyList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });
});
