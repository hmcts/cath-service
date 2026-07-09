import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSimpleListTypeHandler } from "./list-type-handler.js";

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  canAccessPublicationData: vi.fn(),
  resolveListType: vi.fn(),
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload" }
}));

import { canAccessPublicationData, getArtefactById, getPublicationJson, resolveListType } from "@hmcts/publication";

const mockValidate = vi.fn().mockReturnValue({ isValid: true, errors: [] });
const mockRender = vi.fn();

const handlerOptions = {
  en: {
    error403Title: "Access Denied",
    error403Message: "You do not have permission to view this list."
  },
  cy: {
    error403Title: "Mynediad Gwrthodwyd",
    error403Message: "Nid oes gennych ganiatâd i weld y rhestr hon."
  },
  validate: mockValidate,
  logPrefix: "test-handler",
  render: mockRender
};

const mockArtefact = {
  artefactId: "test-artefact-id",
  locationId: "1",
  listTypeId: 999,
  listTypeName: "TEST_LIST_TYPE",
  contentDate: new Date("2025-01-01"),
  lastReceivedDate: new Date("2025-01-01T12:00:00Z"),
  sensitivity: "CLASSIFIED",
  provenance: "MANUAL_UPLOAD",
  isFlatFile: false,
  noMatch: false,
  supersededCount: 0
};

describe("createSimpleListTypeHandler — access control", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: { artefactId: "test-artefact-id" },
      user: undefined
    };

    res = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      setHeader: vi.fn(),
      locals: { locale: "en" }
    };

    vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
    vi.mocked(resolveListType).mockResolvedValue({ id: 999, provenance: "CFT_IDAM", isNonStrategic: true });
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(getPublicationJson).mockResolvedValue([]);
  });

  it("should return 403 when unauthenticated user requests a CLASSIFIED artefact", async () => {
    // Arrange
    vi.mocked(canAccessPublicationData).mockReturnValue(false);
    const handler = createSimpleListTypeHandler(handlerOptions);

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(canAccessPublicationData).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ artefactId: "test-artefact-id" }),
      expect.objectContaining({ id: 999, provenance: "CFT_IDAM", isNonStrategic: true })
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should return 403 when unauthenticated user requests a PRIVATE artefact", async () => {
    // Arrange
    vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "PRIVATE" } as any);
    vi.mocked(canAccessPublicationData).mockReturnValue(false);
    const handler = createSimpleListTypeHandler(handlerOptions);

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });

  it("should render page normally when unauthenticated user requests a PUBLIC artefact", async () => {
    // Arrange — canAccessPublicationData returns true (PUBLIC content is accessible to everyone)
    vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "PUBLIC" } as any);
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(getPublicationJson).mockResolvedValue([{}]);
    mockRender.mockResolvedValue(undefined);
    const handler = createSimpleListTypeHandler(handlerOptions);

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockRender).toHaveBeenCalled();
  });

  it("should render page normally when SYSTEM_ADMIN requests a CLASSIFIED artefact", async () => {
    // Arrange
    req.user = { role: "SYSTEM_ADMIN", provenance: "SSO" } as any;
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(getPublicationJson).mockResolvedValue([{}]);
    mockRender.mockResolvedValue(undefined);
    const handler = createSimpleListTypeHandler(handlerOptions);

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockRender).toHaveBeenCalled();
  });

  it("should render page normally when verified user with matching provenance requests a CLASSIFIED artefact", async () => {
    // Arrange
    req.user = { role: "VERIFIED", provenance: "CFT_IDAM" } as any;
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(getPublicationJson).mockResolvedValue([{}]);
    mockRender.mockResolvedValue(undefined);
    const handler = createSimpleListTypeHandler(handlerOptions);

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockRender).toHaveBeenCalled();
  });

  it("should return 403 when INTERNAL_ADMIN_CTSC user requests a CLASSIFIED artefact", async () => {
    // Arrange
    req.user = { roles: ["INTERNAL_ADMIN_CTSC"], provenance: "SSO" } as any;
    vi.mocked(canAccessPublicationData).mockReturnValue(false);
    const handler = createSimpleListTypeHandler(handlerOptions);

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.any(Object));
  });
});
