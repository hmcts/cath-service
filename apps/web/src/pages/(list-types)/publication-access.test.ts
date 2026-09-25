import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessReason, checkArtefactDataAccess, renderAccessDenied, renderNotFound, sendAccessDenied, sendFileNotFound } from "./publication-access.js";

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  resolveListType: vi.fn(),
  canAccessPublicationData: vi.fn()
}));

import { canAccessPublicationData, getArtefactById, resolveListType } from "@hmcts/publication";

const ARTEFACT_ID = "12345678-1234-1234-1234-123456789abc";
const NO_STORE = "private, max-age=0, no-cache, no-store, must-revalidate";

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.render = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
};

describe("checkArtefactDataAccess", () => {
  const artefact = { artefactId: ARTEFACT_ID, listTypeId: 999, listTypeName: "SJP_PUBLIC_LIST", sensitivity: "PUBLIC" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getArtefactById).mockResolvedValue(artefact as never);
    vi.mocked(resolveListType).mockResolvedValue({ id: 999, provenance: "PI_AAD", isNonStrategic: false });
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
  });

  it("should allow access when canAccessPublicationData permits it", async () => {
    // Act
    const result = await checkArtefactDataAccess(undefined, ARTEFACT_ID);

    // Assert
    expect(result).toEqual({ allowed: true });
  });

  it("should deny with ACCESS_DENIED when canAccessPublicationData refuses", async () => {
    // Arrange
    vi.mocked(canAccessPublicationData).mockReturnValue(false);

    // Act
    const result = await checkArtefactDataAccess(undefined, ARTEFACT_ID);

    // Assert
    expect(result).toEqual({ allowed: false, reason: AccessReason.ACCESS_DENIED });
  });

  it("should deny with NOT_FOUND when the artefact does not exist", async () => {
    // Arrange
    vi.mocked(getArtefactById).mockResolvedValue(null);

    // Act
    const result = await checkArtefactDataAccess(undefined, ARTEFACT_ID);

    // Assert
    expect(result).toEqual({ allowed: false, reason: AccessReason.NOT_FOUND });
    expect(canAccessPublicationData).not.toHaveBeenCalled();
  });

  it("should deny with NOT_FOUND when no artefactId is supplied", async () => {
    // Act
    const result = await checkArtefactDataAccess(undefined, undefined);

    // Assert
    expect(result).toEqual({ allowed: false, reason: AccessReason.NOT_FOUND });
    expect(getArtefactById).not.toHaveBeenCalled();
  });

  it("should resolve the list type from the artefact and pass it to the access check", async () => {
    // Arrange
    const user = { role: "VERIFIED", provenance: "PI_AAD" };

    // Act
    await checkArtefactDataAccess(user as never, ARTEFACT_ID);

    // Assert
    expect(resolveListType).toHaveBeenCalledWith(999);
    expect(canAccessPublicationData).toHaveBeenCalledWith(user, artefact, { id: 999, provenance: "PI_AAD", isNonStrategic: false });
  });
});

describe("renderAccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the 403 page with no-store caching", () => {
    // Arrange
    const res = mockResponse();

    // Act
    renderAccessDenied(res, "en");

    // Assert
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", NO_STORE);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", expect.objectContaining({ t: expect.objectContaining({ title: "Access Denied" }) }));
  });

  it("should select Welsh content when the locale is cy", () => {
    // Arrange
    const res = mockResponse();

    // Act
    renderAccessDenied(res, "cy");

    // Assert
    const [, options] = vi.mocked(res.render).mock.calls[0] as [string, { t: { title: string }; en: { title: string } }];
    expect(options.t.title).not.toEqual(options.en.title);
  });
});

describe("renderNotFound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the 404 page with the supplied locale content", () => {
    // Arrange
    const res = mockResponse();
    const content = { en: { title: "en" }, cy: { title: "cy" } };

    // Act
    renderNotFound(res, "en", content);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/404", { ...content, locale: "en" });
  });
});

describe("sendAccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 with no-store caching", () => {
    // Arrange
    const res = mockResponse();

    // Act
    sendAccessDenied(res);

    // Assert
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", NO_STORE);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
  });
});

describe("sendFileNotFound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 with a file-not-found payload", () => {
    // Arrange
    const res = mockResponse();

    // Act
    sendFileNotFound(res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found" });
  });
});
