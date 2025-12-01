import type { UserProfile } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sensitivity } from "../sensitivity.js";
import { requirePublicationAccess, requirePublicationDataAccess } from "./middleware.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 1,
      listType: "test-list",
      englishFriendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      jsonSchema: {},
      provenance: "CFT_IDAM",
      urlPath: "/test"
    }
  ]
}));

const createMockRequest = (params: Record<string, string>, user?: UserProfile): Partial<Request> => ({
  params,
  user
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis()
  };
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe("requirePublicationAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if publication ID is missing", async () => {
    const req = createMockRequest({}, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/400");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 404 if publication not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const req = createMockRequest({ id: "test-id" }, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/404");
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow access to PUBLIC publication for unauthenticated user", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.PUBLIC,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const req = createMockRequest({ id: "test-id" }, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should deny access to PRIVATE publication for unauthenticated user", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.PRIVATE,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const req = createMockRequest({ id: "test-id" }, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403");
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow system admin to access any publication", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.CLASSIFIED,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin User",
      role: "SYSTEM_ADMIN",
      provenance: "SSO"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should allow verified user with matching provenance to access CLASSIFIED", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.CLASSIFIED,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      role: "VERIFIED",
      provenance: "CFT_IDAM"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should deny verified user with non-matching provenance to access CLASSIFIED", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.CLASSIFIED,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      role: "VERIFIED",
      provenance: "B2C_IDAM"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403");
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(prisma.artefact.findUnique).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest({ id: "test-id" }, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/500");
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requirePublicationDataAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if publication ID is missing", async () => {
    const req = createMockRequest({}, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationDataAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/400");
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow access to PUBLIC publication data for everyone", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.PUBLIC,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const req = createMockRequest({ id: "test-id" }, undefined) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationDataAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should deny LOCAL_ADMIN access to PRIVATE publication data", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.PRIVATE,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "admin@example.com",
      displayName: "Local Admin",
      role: "INTERNAL_ADMIN_LOCAL",
      provenance: "SSO"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationDataAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", {
      en: {
        title: "Access Denied",
        message: "You do not have permission to view the data for this publication. You can view metadata only."
      },
      cy: {
        title: "Mynediad wedi'i Wrthod",
        message: "Nid oes gennych ganiatâd i weld y data ar gyfer y cyhoeddiad hwn. Gallwch weld metadata yn unig."
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should deny CTSC_ADMIN access to CLASSIFIED publication data", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.CLASSIFIED,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "admin@example.com",
      displayName: "CTSC Admin",
      role: "INTERNAL_ADMIN_CTSC",
      provenance: "SSO"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationDataAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith(
      "errors/403",
      expect.objectContaining({
        en: expect.objectContaining({
          title: "Access Denied"
        })
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow SYSTEM_ADMIN access to any publication data", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.CLASSIFIED,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "admin@example.com",
      displayName: "System Admin",
      role: "SYSTEM_ADMIN",
      provenance: "SSO"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationDataAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should allow verified user to access PRIVATE publication data", async () => {
    const artefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 1,
      contentDate: new Date(),
      sensitivity: Sensitivity.PRIVATE,
      language: "ENGLISH",
      displayFrom: new Date(),
      displayTo: new Date(),
      isFlatFile: false,
      provenance: "CFT_IDAM",
      noMatch: false
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact);

    const user: UserProfile = {
      id: "user-1",
      email: "user@example.com",
      displayName: "Verified User",
      role: "VERIFIED",
      provenance: "B2C_IDAM"
    };

    const req = createMockRequest({ id: "test-id" }, user) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const middleware = requirePublicationDataAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
