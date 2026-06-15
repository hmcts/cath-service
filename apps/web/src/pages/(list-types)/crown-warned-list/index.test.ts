import { readFile } from "node:fs/promises";
import { renderCrownWarnedListData, validateCrownWarnedList } from "@hmcts/crown-warned-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById } from "@hmcts/publication";
import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("node:fs/promises");
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
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
vi.mock("@hmcts/crown-warned-list");

describe("crown-warned-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const mockListType = {
    id: 1,
    allowedProvenance: ["PDDA"],
    isNonStrategic: false
  };

  const mockArtefact = {
    artefactId: "test-artefact-123",
    locationId: "100",
    listTypeId: 1,
    contentDate: new Date("2025-01-15"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2025-01-15"),
    displayTo: new Date("2025-01-22"),
    lastReceivedDate: new Date("2025-01-15"),
    isFlatFile: false,
    provenance: "PDDA",
    supersededCount: 0,
    noMatch: false
  } as any;

  const mockJsonData = {
    document: { publicationDate: "2025-01-14T12:00:00Z" },
    venue: { venueName: "Crown Court at Leeds", venueAddress: { line: [], postCode: "LS1 1AA" } },
    courtLists: []
  };

  const mockRenderedData = {
    header: {
      locationName: "Crown Court at Leeds",
      addressLines: [],
      contentDate: "15 January 2025",
      lastUpdated: "14 January 2025",
      weekCommencing: "20 January 2025"
    },
    openJustice: { venueName: "Crown Court at Leeds", email: "", phone: "" },
    groupedCategories: []
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
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

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should return 403 when user cannot access publication", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(canAccessPublicationData).mockReturnValue(false);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should pass undefined listType when dbListType is not found", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCrownWarnedList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCrownWarnedListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(canAccessPublicationData).toHaveBeenCalledWith(req.user, mockArtefact, undefined);
  });

  it("should return 404 when JSON file cannot be read", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    await GET(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should return 400 when JSON validation fails", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCrownWarnedList).mockReturnValue({ isValid: false, errors: ["Validation error"] } as any);

    await GET(req as Request, res as Response);

    expect(validateCrownWarnedList).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("[crown-warned-list] Validation errors:", ["Validation error"]);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should successfully render warned list in English", async () => {
    req.query = { artefactId: "test-artefact-123" };
    res.locals = { locale: "en" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCrownWarnedList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCrownWarnedListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(renderCrownWarnedListData).toHaveBeenCalledWith(mockJsonData, {
      locationId: "100",
      contentDate: mockArtefact.contentDate,
      locale: "en"
    });
    const renderCall = vi.mocked(res.render).mock.calls[0];
    expect(renderCall[0]).toBe("crown-warned-list");
    expect(renderCall[1]).toHaveProperty("en");
    expect(renderCall[1]).toHaveProperty("cy");
    expect(renderCall[1]).toHaveProperty("groupedCategories");
    expect(renderCall[1]).toHaveProperty("t");
  });

  it("should successfully render warned list in Welsh", async () => {
    req.query = { artefactId: "test-artefact-123" };
    res.locals = { locale: "cy" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCrownWarnedList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCrownWarnedListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(renderCrownWarnedListData).toHaveBeenCalledWith(mockJsonData, {
      locationId: "100",
      contentDate: mockArtefact.contentDate,
      locale: "cy"
    });
    expect(res.render).toHaveBeenCalledWith("crown-warned-list", expect.any(Object));
  });

  it("should return 500 on unexpected error", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

    await GET(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[crown-warned-list] Unexpected error:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });
});
