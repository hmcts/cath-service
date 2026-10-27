import { USER_ROLES } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, getHandler, POST, postHandler } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: (roles: string[]) => Object.assign(vi.fn(), { roles }),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  updateThirdPartyUserStatus: vi.fn(),
  isThirdPartyUserStatus: (value: unknown) => typeof value === "string" && ["PENDING", "ACTIVE", "SUSPENDED"].includes(value),
  THIRD_PARTY_USER_STATUSES: ["PENDING", "ACTIVE", "SUSPENDED"]
}));

vi.mock("../../../../audit-log/logger.js", () => ({
  AuditLogAction: {
    VIEW_THIRD_PARTY_SUBSCRIBER_STATUS: "View third party subscriber status",
    UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS: "Update third party subscriber status"
  },
  logAction: vi.fn()
}));

import { findThirdPartyUserById, updateThirdPartyUserStatus } from "@hmcts/third-party-user";
import { logAction } from "../../../../audit-log/logger.js";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const TEMPLATE = "third-party-subscribers/[id]/status/index";
const mockUser = { id: USER_ID, name: "Test Corp", status: "PENDING", createdAt: new Date(), subscriptions: [] };

describe("third-party-subscribers status page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: {} as never,
      params: { id: USER_ID },
      user: { id: "admin-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN", provenance: "SSO" }
    };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("role guard", () => {
    it("should restrict GET and POST to system admins as the first middleware", () => {
      // Assert
      expect(GET).toHaveLength(2);
      expect((GET[0] as RoleGuard).roles).toEqual([USER_ROLES.SYSTEM_ADMIN]);
      expect(GET[1]).toBe(getHandler);
      expect(POST).toHaveLength(2);
      expect((POST[0] as RoleGuard).roles).toEqual([USER_ROLES.SYSTEM_ADMIN]);
      expect(POST[1]).toBe(postHandler);
    });
  });

  describe("getHandler", () => {
    it("should redirect to the subscribers list when the subscriber is not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
      expect(res.render).not.toHaveBeenCalled();
      expect(logAction).not.toHaveBeenCalled();
    });

    it("should redirect to the Welsh subscribers list when the subscriber is not found", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers?lng=cy");
    });

    it("should render the page with the current status pre-selected", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue({ ...mockUser, status: "SUSPENDED" } as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(findThirdPartyUserById).toHaveBeenCalledWith(USER_ID);
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: "Manage subscriber status",
          userId: USER_ID,
          selectedStatus: "SUSPENDED",
          lngParam: "",
          statusItems: [
            { value: "PENDING", text: "Pending" },
            { value: "ACTIVE", text: "Active" },
            { value: "SUSPENDED", text: "Suspended" }
          ],
          errors: undefined
        })
      );
    });

    it("should render Welsh status labels when the locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: "Rheoli statws tanysgrifwr",
          lngParam: "?lng=cy",
          statusItems: [
            { value: "PENDING", text: "Yn yr arfaeth" },
            { value: "ACTIVE", text: "Gweithredol" },
            { value: "SUSPENDED", text: "Wedi'i atal" }
          ]
        })
      );
    });

    it("should write a view audit entry for the subscriber", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(logAction).toHaveBeenCalledWith({
        userId: "admin-1",
        userEmail: "admin@example.com",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "SSO",
        action: "View third party subscriber status",
        details: `ID: ${USER_ID}`
      });
    });

    it("should still render the page when the view audit fails", async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(logAction).mockRejectedValue(new Error("db down"));

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ selectedStatus: "PENDING" }));
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("postHandler", () => {
    it("should redirect to the subscribers list without updating when the subscriber is not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);
      req.body = { status: "ACTIVE" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
      expect(req.auditMetadata).toBeUndefined();
    });

    it("should redirect to the Welsh subscribers list when the subscriber is not found", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);
      req.body = { status: "ACTIVE" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers?lng=cy");
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
    });

    it.each([
      ["missing", {}],
      ["an unknown value", { status: "DELETED" }],
      ["a lowercase value", { status: "active" }],
      ["an array", { status: ["ACTIVE", "SUSPENDED"] }]
    ])("should re-render with an error and keep the current status when the status is %s", async (_label, body) => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = body;

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errors: [{ text: "Select a status", href: "#status" }],
          errorSummaryTitle: "There is a problem",
          selectedStatus: "PENDING"
        })
      );
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it.each([
      ["missing", {}],
      ["an unknown value", { status: "DELETED" }],
      ["a lowercase value", { status: "active" }],
      ["an array", { status: ["ACTIVE"] }]
    ])("should re-render with a Welsh error when the status is %s and the locale is cy", async (_label, body) => {
      // Arrange
      res.locals = { locale: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = body;

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errors: [{ text: "Dewiswch statws", href: "#status" }],
          errorSummaryTitle: "Mae problem wedi codi",
          selectedStatus: "PENDING"
        })
      );
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
    });

    it("should re-render with an error when the request has no body", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = undefined;

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ errors: [{ text: "Select a status", href: "#status" }] }));
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
    });

    it("should update the status and redirect to the success page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = { status: "ACTIVE" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).toHaveBeenCalledWith(USER_ID, "ACTIVE");
      expect(res.redirect).toHaveBeenCalledWith(`/third-party-subscribers/${USER_ID}/status/success`);
    });

    it("should redirect to the Welsh success page when the locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = { status: "SUSPENDED" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).toHaveBeenCalledWith(USER_ID, "SUSPENDED");
      expect(res.redirect).toHaveBeenCalledWith(`/third-party-subscribers/${USER_ID}/status/success?lng=cy`);
    });

    it("should set update audit metadata with the old and new status", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = { status: "ACTIVE" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "Update third party subscriber status",
        entityInfo: `Name: Test Corp, ID: ${USER_ID}, Status: PENDING -> ACTIVE`
      });
    });

    it("should accept the same status being submitted again", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = { status: "PENDING" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).toHaveBeenCalledWith(USER_ID, "PENDING");
      expect(req.auditMetadata?.entityInfo).toBe(`Name: Test Corp, ID: ${USER_ID}, Status: PENDING -> PENDING`);
      expect(res.redirect).toHaveBeenCalledWith(`/third-party-subscribers/${USER_ID}/status/success`);
    });
  });
});

type RoleGuard = { roles: string[] };
