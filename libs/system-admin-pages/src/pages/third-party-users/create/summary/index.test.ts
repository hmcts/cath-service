import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  createThirdPartyUser: vi.fn()
}));

import { createThirdPartyUser } from "@hmcts/third-party-user";

describe("third-party-users create summary page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should redirect to create page when session has no name", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/create");
    });

    it("should render summary page with name from session", async () => {
      // Arrange
      req.session = { thirdPartyCreate: { name: "Test User" } } as never;

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/create/summary/index",
        expect.objectContaining({
          pageTitle: "Create third party user summary",
          name: "Test User"
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to create page when session has no name", async () => {
      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/create");
    });

    it("should create user and redirect to confirmation", async () => {
      // Arrange
      req.session = { thirdPartyCreate: { name: "New User" } } as never;
      vi.mocked(createThirdPartyUser).mockResolvedValue({ id: "abc", name: "New User", createdAt: new Date() } as never);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(createThirdPartyUser).toHaveBeenCalledWith("New User");
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/create/confirmation");
      expect((req.session as never as Record<string, unknown>).thirdPartyCreate).toMatchObject({ createdId: "abc" });
    });

    it("should skip creation and redirect if createdId already in session (idempotency)", async () => {
      // Arrange
      req.session = { thirdPartyCreate: { name: "Existing User", createdId: "existing-id" } } as never;

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(createThirdPartyUser).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/create/confirmation");
    });

    it("should set audit metadata on creation", async () => {
      // Arrange
      req.session = { thirdPartyCreate: { name: "Audit User" } } as never;
      vi.mocked(createThirdPartyUser).mockResolvedValue({ id: "xyz", name: "Audit User", createdAt: new Date() } as never);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toMatchObject({
        shouldLog: true,
        action: "CREATE_THIRD_PARTY_USER",
        entityInfo: "Name: Audit User"
      });
    });
  });
});
