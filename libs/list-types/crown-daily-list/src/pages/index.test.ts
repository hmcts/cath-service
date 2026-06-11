import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  TEMP_STORAGE_BASE: "/tmp/test-storage"
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  canAccessPublicationData: vi.fn(),
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    PDDA: "PDDA"
  }
}));

vi.mock("../validation/json-validator.js", () => ({
  validateCrownDailyList: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderCrownDailyListData: vi.fn()
}));

import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById } from "@hmcts/publication";
import { renderCrownDailyListData } from "../rendering/renderer.js";
import { validateCrownDailyList } from "../validation/json-validator.js";
import { GET } from "./index.js";

describe("Crown Daily List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockArtefact = {
    artefactId: "test-artefact-123",
    locationId: "100",
    listTypeId: 1,
    contentDate: new Date("2025-01-15"),
    provenance: "PDDA"
  };

  const mockListType = { id: 1, allowedProvenance: "PDDA", isNonStrategic: false };

  const mockRenderedData = {
    header: { locationName: "Crown Court at Leeds", addressLines: [], contentDate: "15 January 2025", lastUpdated: "14 January 2025" },
    openJustice: { venueName: "Crown Court at Leeds", email: "", phone: "" },
    listData: { courtLists: [] }
  };

  const validJsonData = {
    document: { publicationDate: "2025-01-14T12:00:00Z" },
    venue: { venueName: "Crown Court at Leeds", venueAddress: { line: [], postCode: "LS1 1AA" } },
    courtLists: []
  };

  beforeEach(() => {
    vi.clearAllMocks();

    req = { query: {} };

    res = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  it("should return 400 when artefactId is missing", async () => {
    req.query = {};

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: expect.any(String) }));
  });

  it("should return 404 when artefact is not found", async () => {
    req.query = { artefactId: "non-existent" };
    vi.mocked(getArtefactById).mockResolvedValue(null);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should return 403 when access is denied", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as never);
    vi.mocked(canAccessPublicationData).mockReturnValue(false);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should return 404 when JSON file is not found", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as never);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT: no such file"));

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should return 400 when JSON validation fails", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as never);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ invalid: "data" }));
    vi.mocked(validateCrownDailyList).mockReturnValue({ isValid: false, errors: ["missing field"] });

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });

  it("should render successfully with correct props", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as never);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validJsonData));
    vi.mocked(validateCrownDailyList).mockReturnValue({ isValid: true, errors: [] });
    vi.mocked(renderCrownDailyListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith(
      "crown-daily-list",
      expect.objectContaining({
        header: mockRenderedData.header,
        listData: mockRenderedData.listData,
        dataSource: "PDDA"
      })
    );
  });

  it("should use Welsh locale when specified", async () => {
    req.query = { artefactId: "test-artefact-123" };
    res.locals = { locale: "cy" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as never);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validJsonData));
    vi.mocked(validateCrownDailyList).mockReturnValue({ isValid: true, errors: [] });
    vi.mocked(renderCrownDailyListData).mockResolvedValue(mockRenderedData);

    await GET(req as Request, res as Response);

    expect(renderCrownDailyListData).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ locale: "cy" }));
  });

  it("should return 500 on unexpected error", async () => {
    req.query = { artefactId: "test-artefact-123" };
    vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.any(Object));
  });
});
