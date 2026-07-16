import { renderEtFortnightlyList, validateEtFortnightlyPressList } from "@hmcts/et-fortnightly-list";
import { canAccessPublicationData, getArtefactById, getPublicationJson } from "@hmcts/publication";
import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

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
vi.mock("@hmcts/et-fortnightly-list");

const mockArtefact = {
  artefactId: "test-id",
  locationId: "1",
  listTypeId: 999,
  listTypeName: "ET_FORTNIGHTLY_PRESS_LIST",
  contentDate: new Date("2025-01-13"),
  lastReceivedDate: new Date("2025-01-13"),
  provenance: "MANUAL_UPLOAD"
} as any;

const mockJsonData = {
  document: { publicationDate: "2025-01-13T09:00:00.000Z" },
  venue: { venueName: "Leeds ET", venueAddress: { line: ["Court Address"] } },
  courtLists: []
};

describe("et-fortnightly-list controller", () => {
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
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return 400 when artefactId is missing", async () => {
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return 404 when artefact is not found", async () => {
    req.query = { artefactId: "nonexistent" };
    vi.mocked(getArtefactById).mockResolvedValue(null);
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should return 403 when the user cannot access the publication", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(canAccessPublicationData).mockReturnValue(false);
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should return 400 when JSON validation fails", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(getPublicationJson).mockResolvedValue({ invalid: "data" });
    vi.mocked(validateEtFortnightlyPressList).mockReturnValue({ isValid: false, errors: ["boom"] } as any);
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should render the list with valid data in English", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
    vi.mocked(validateEtFortnightlyPressList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderEtFortnightlyList).mockResolvedValue({
      header: { regionName: "Midlands", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025" },
      openJustice: { venueName: "Leeds ET", email: "et@example.com", phone: "123" },
      courts: []
    } as any);

    await GET(req as Request, res as Response);

    const renderCall = vi.mocked(res.render!).mock.calls[0]!;
    expect(renderCall[0]).toBe("et-fortnightly-list");
    expect(renderCall[1]).toMatchObject({ dataSource: "Manual Upload" });
    expect(renderCall[1]).toHaveProperty("t");
    expect(renderCall[1]).toHaveProperty("courts");
  });

  it("should render the list in Welsh", async () => {
    req.query = { artefactId: "test-id" };
    res.locals = { locale: "cy" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(getPublicationJson).mockResolvedValue(mockJsonData);
    vi.mocked(validateEtFortnightlyPressList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderEtFortnightlyList).mockResolvedValue({
      header: { regionName: "Midlands", addressLines: [], contentDate: "13 Ionawr 2025", lastUpdated: "13 Ionawr 2025" },
      openJustice: { venueName: "Leeds ET", email: "et@example.com", phone: "123" },
      courts: []
    } as any);

    await GET(req as Request, res as Response);

    expect(renderEtFortnightlyList).toHaveBeenCalledWith(mockJsonData, expect.objectContaining({ locale: "cy" }));
    expect(res.render).toHaveBeenCalledWith("et-fortnightly-list", expect.any(Object));
  });

  it("should return 500 when an unexpected error occurs", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockRejectedValue(new Error("db error"));
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
