import { readFile } from "node:fs/promises";
import { renderCauseListData, validateCivilDailyCauseList } from "@hmcts/civil-daily-cause-list";
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
vi.mock("@hmcts/civil-daily-cause-list");

describe("civil-daily-cause-list controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const mockListType = {
    id: 1,
    allowedProvenance: ["CFT_IDAM"],
    isNonStrategic: false
  };

  const mockArtefact = {
    artefactId: "test-id",
    locationId: "1",
    listTypeId: 1,
    contentDate: new Date("2025-01-13"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2025-01-13"),
    displayTo: new Date("2025-01-20"),
    lastReceivedDate: new Date("2025-01-13"),
    isFlatFile: false,
    provenance: "CFT_IDAM",
    supersededCount: 0,
    noMatch: false
  } as any;

  const mockJsonData = {
    document: { publicationDate: "2025-01-13T09:00:00.000Z" },
    venue: { venueName: "Test Court", venueAddress: { line: ["Court Address"], postCode: "AB1 2CD" } },
    courtLists: []
  };

  const mockRenderedData = {
    header: { locationName: "Test Court", addressLines: [], contentDate: "13 January 2025", lastUpdated: "13 January 2025 at 9am" },
    openJustice: { venueName: "Test Court", email: "", phone: "" },
    listData: mockJsonData
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

    expect(getArtefactById).toHaveBeenCalledWith("nonexistent-id");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should return 403 when user cannot access publication", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(canAccessPublicationData).mockReturnValue(false);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should pass undefined listType when dbListType is not found", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(canAccessPublicationData).toHaveBeenCalledWith(req.user, mockArtefact, undefined);
  });

  it("should return 404 when JSON file cannot be read", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    await GET(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should return 400 when JSON validation fails", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: false, errors: ["Validation error"] } as any);

    await GET(req as Request, res as Response);

    expect(validateCivilDailyCauseList).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("[civil-daily-cause-list] Validation errors:", ["Validation error"]);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should successfully render cause list in English", async () => {
    req.query = { artefactId: "test-id" };
    res.locals = { locale: "en" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
      locationId: "1",
      contentDate: mockArtefact.contentDate,
      locale: "en"
    });
    const renderCall = vi.mocked(res.render).mock.calls[0];
    expect(renderCall[0]).toBe("civil-daily-cause-list");
    expect(renderCall[1]).toHaveProperty("en");
    expect(renderCall[1]).toHaveProperty("cy");
    expect(renderCall[1]).toHaveProperty("header");
    expect(renderCall[1]).toHaveProperty("openJustice");
    expect(renderCall[1]).toHaveProperty("listData");
    expect(renderCall[1]).toHaveProperty("t");
  });

  it("should successfully render cause list in Welsh", async () => {
    req.query = { artefactId: "test-id" };
    res.locals = { locale: "cy" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
      locationId: "1",
      contentDate: mockArtefact.contentDate,
      locale: "cy"
    });
    expect(res.render).toHaveBeenCalledWith("civil-daily-cause-list", expect.any(Object));
  });

  it("should default to English when locale is not set", async () => {
    req.query = { artefactId: "test-id" };
    res.locals = {};
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(renderCauseListData).toHaveBeenCalledWith(mockJsonData, {
      locationId: "1",
      contentDate: mockArtefact.contentDate,
      locale: "en"
    });
  });

  it("should use provenance label for data source", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, provenance: "MANUAL_UPLOAD" });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith("civil-daily-cause-list", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use raw provenance when label not found", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, provenance: "UNKNOWN_PROVENANCE" });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
    vi.mocked(validateCivilDailyCauseList).mockReturnValue({ isValid: true, errors: [] } as any);
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith("civil-daily-cause-list", expect.objectContaining({ dataSource: "UNKNOWN_PROVENANCE" }));
  });

  it("should return 500 on unexpected error", async () => {
    req.query = { artefactId: "test-id" };
    vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

    await GET(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[civil-daily-cause-list] Unexpected error:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });
});
