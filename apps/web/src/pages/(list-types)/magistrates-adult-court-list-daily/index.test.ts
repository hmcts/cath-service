import type { Request, Response } from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@hmcts/magistrates-adult-court-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/magistrates-adult-court-list")>();
  return {
    ...actual,
    validateMagistratesAdultCourtList: vi.fn(),
    renderMagistratesAdultCourtList: vi.fn()
  };
});

import { renderMagistratesAdultCourtList, validateMagistratesAdultCourtList } from "@hmcts/magistrates-adult-court-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

describe("magistrates-adult-court-list-daily controller", () => {
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
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 57, allowedProvenance: ["CRIME_IDAM"], isNonStrategic: false } as any);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("GET", () => {
    it("should return 400 when artefactId is missing", async () => {
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "nonexistent-id" };
      vi.mocked(getArtefactById).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should render with valid data using daily locales", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id"));
      vi.mocked(getPublicationJson).mockResolvedValue({});
      vi.mocked(validateMagistratesAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(buildMockRenderedData() as any);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("magistrates-adult-court-list/index");
      expect(renderCall[1]).toMatchObject({
        title: "Magistrates Adult Court List - Daily"
      });
    });

    it("should render with Welsh locale", async () => {
      req.query = { artefactId: "test-id" };
      res.locals = { locale: "cy" };
      vi.mocked(getArtefactById).mockResolvedValue(buildMockArtefact("test-id"));
      vi.mocked(getPublicationJson).mockResolvedValue({});
      vi.mocked(validateMagistratesAdultCourtList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" } as any);
      vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(buildMockRenderedData() as any);

      await GET(req as Request, res as Response);

      expect(renderMagistratesAdultCourtList).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ locale: "cy" }));
    });
  });
});

function buildMockArtefact(artefactId: string) {
  return {
    artefactId,
    locationId: "1",
    listTypeId: 57,
    listTypeName: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
    contentDate: new Date("2025-01-13"),
    sensitivity: "CLASSIFIED",
    language: "ENGLISH",
    displayFrom: new Date("2025-01-13"),
    displayTo: new Date("2025-01-20"),
    lastReceivedDate: new Date("2025-01-13"),
    isFlatFile: false,
    provenance: "CRIME_IDAM",
    supersededCount: 0,
    noMatch: false
  } as any;
}

function buildMockRenderedData() {
  return {
    header: {
      locationName: "Test Court",
      contentDate: "13 January 2025",
      publishedDate: "13 January 2025",
      publishedTime: "9:30am"
    },
    openJustice: null,
    listData: {}
  };
}
