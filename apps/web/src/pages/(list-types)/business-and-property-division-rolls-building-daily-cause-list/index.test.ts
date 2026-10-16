import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    createJsonValidator: () => mockValidate,
    provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", CFT_IDAM: "CFT IDAM" },
    provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", CFT_IDAM: "CFT IDAM" }
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
  resolveListType: vi.fn().mockResolvedValue({ id: 1, provenance: "CFT_IDAM", isNonStrategic: true }),
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload" }
}));

vi.mock("@hmcts/business-and-property-division-rolls-building-daily-cause-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/business-and-property-division-rolls-building-daily-cause-list")>();
  return {
    ...actual,
    renderBusinessAndPropertyRolls: vi.fn()
  };
});

import { renderBusinessAndPropertyRolls } from "@hmcts/business-and-property-division-rolls-building-daily-cause-list";
import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

const SUPPORTED = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";

describe("Business and Property Division Rolls Building page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = { status: vi.fn().mockReturnThis(), render: vi.fn(), locals: { locale: "en" } };
  });

  it("should render the list successfully with valid data", async () => {
    const mockArtefact = {
      artefactId: "a-1",
      listTypeId: 999,
      listTypeName: SUPPORTED,
      contentDate: new Date("2026-01-15"),
      lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
      provenance: "MANUAL_UPLOAD"
    };
    const mockJson = { appealList: [] };
    const mockRendered = { header: { listTitle: "T" }, sections: [{ key: "appealList", title: "Appeal List", hearings: [] }] };

    req.query = { artefactId: "a-1" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(getPublicationJson).mockResolvedValue(mockJson);
    mockValidate.mockReturnValue({ isValid: true, errors: [] });
    vi.mocked(renderBusinessAndPropertyRolls).mockReturnValue(mockRendered as never);

    await GET(req as Request, res as Response);

    const renderCall = vi.mocked(res.render!).mock.calls[0]!;
    expect(renderCall[0]).toBe("business-and-property-division-rolls-building-daily-cause-list");
    expect(renderCall[1]).toMatchObject({ header: mockRendered.header, sections: mockRendered.sections, dataSource: "Manual Upload" });
  });

  it("should return 400 when artefactId is missing", async () => {
    req.query = {};
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 when the list type name does not match", async () => {
    req.query = { artefactId: "a-1" };
    vi.mocked(getArtefactById).mockResolvedValue({ artefactId: "a-1", listTypeName: "OTHER" } as never);

    await GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Invalid List Type" }));
  });

  it("should return 404 when the artefact is not found", async () => {
    req.query = { artefactId: "missing" };
    vi.mocked(getArtefactById).mockResolvedValue(null);
    await GET(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should use the Welsh locale when specified", async () => {
    const mockArtefact = {
      artefactId: "a-1",
      listTypeName: SUPPORTED,
      contentDate: new Date("2026-01-15"),
      lastReceivedDate: new Date("2026-01-14T12:00:00Z"),
      provenance: "MANUAL_UPLOAD"
    };
    req.query = { artefactId: "a-1" };
    res.locals = { locale: "cy" };
    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as never);
    vi.mocked(getPublicationJson).mockResolvedValue({});
    mockValidate.mockReturnValue({ isValid: true, errors: [] });
    vi.mocked(renderBusinessAndPropertyRolls).mockReturnValue({ header: { listTitle: "T" }, sections: [] } as never);

    await GET(req as Request, res as Response);

    expect(renderBusinessAndPropertyRolls).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });
});
