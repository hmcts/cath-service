import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, getHandler, POST, postHandler } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn((roles: string[]) => ({ requiredRoles: roles })),
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
    UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS: "Update third party subscriber status",
    VIEW_THIRD_PARTY_SUBSCRIBER_STATUS: "View third party subscriber status"
  },
  logAction: vi.fn()
}));

import { findThirdPartyUserById, updateThirdPartyUserStatus } from "@hmcts/third-party-user";
import { logAction } from "../../../../audit-log/logger.js";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const TEMPLATE = "third-party-subscribers/[id]/status/index";

describe("third-party-subscribers status page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    req = {
      query: {},
      body: {},
      session: {} as never,
      params: { id: USER_ID },
      user: { id: "admin-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN", provenance: "SSO" }
    };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
    vi.mocked(findThirdPartyUserById).mockResolvedValue(buildUser());
  });

  describe("route protection", () => {
    it("should require the system admin role on GET and POST", () => {
      expect(GET).toEqual([{ requiredRoles: ["SYSTEM_ADMIN"] }, getHandler]);
      expect(POST).toEqual([{ requiredRoles: ["SYSTEM_ADMIN"] }, postHandler]);
    });
  });

  describe("getHandler", () => {
    it("should render the page with the current status selected", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(buildUser({ status: "SUSPENDED" }));

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(findThirdPartyUserById).toHaveBeenCalledWith(USER_ID);
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: "Manage User Status",
          userId: USER_ID,
          lngParam: "",
          errors: undefined,
          statusItems: [
            { value: "PENDING", text: "Pending", selected: false },
            { value: "ACTIVE", text: "Active", selected: false },
            { value: "SUSPENDED", text: "Suspended", selected: true }
          ]
        })
      );
    });

    it("should render Welsh labels and the Welsh language parameter", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: "Rheoli Statws Defnyddiwr",
          lngParam: "?lng=cy",
          statusItems: [
            { value: "PENDING", text: "Yn yr arfaeth", selected: true },
            { value: "ACTIVE", text: "Gweithredol", selected: false },
            { value: "SUSPENDED", text: "Wedi'i atal", selected: false }
          ]
        })
      );
    });

    it("should write a view audit log entry for the current admin", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(logAction).toHaveBeenCalledWith({
        userId: "admin-1",
        userEmail: "admin@example.com",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "SSO",
        action: "View third party subscriber status",
        details: `Name: Test Corp, ID: ${USER_ID}`
      });
    });

    it("should still render the page when the view audit write fails", async () => {
      // Arrange
      vi.mocked(logAction).mockRejectedValue(new Error("DB down"));

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.any(Object));
      expect(console.error).toHaveBeenCalled();
    });

    it.each([
      ["en", "/third-party-subscribers"],
      ["cy", "/third-party-subscribers?lng=cy"]
    ])("should redirect to the subscriber list in %s when the subscriber is not found", async (locale, expected) => {
      // Arrange
      res.locals = { locale };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(expected);
      expect(res.render).not.toHaveBeenCalled();
      expect(logAction).not.toHaveBeenCalled();
    });
  });

  describe("postHandler", () => {
    it.each([
      ["en", "PENDING", "ACTIVE", `/third-party-subscribers/${USER_ID}/status/success`],
      ["cy", "ACTIVE", "SUSPENDED", `/third-party-subscribers/${USER_ID}/status/success?lng=cy`]
    ])("should update the status, record the change and redirect to success in %s", async (locale, before, after, expected) => {
      // Arrange
      res.locals = { locale };
      req.body = { status: after };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(buildUser({ status: before }));

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).toHaveBeenCalledWith(USER_ID, after);
      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "Update third party subscriber status",
        entityInfo: `Name: Test Corp, ID: ${USER_ID}, Before: ${before}, After: ${after}`
      });
      expect(res.redirect).toHaveBeenCalledWith(expected);
    });

    it("should treat resubmitting the same status as a successful update", async () => {
      // Arrange
      req.body = { status: "PENDING" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).toHaveBeenCalledWith(USER_ID, "PENDING");
      expect(req.auditMetadata?.entityInfo).toContain("Before: PENDING, After: PENDING");
      expect(res.redirect).toHaveBeenCalledWith(`/third-party-subscribers/${USER_ID}/status/success`);
    });

    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["lowercase", "active"],
      ["unknown", "DELETED"],
      ["an array", ["ACTIVE", "SUSPENDED"]]
    ])("should re-render with the error and nothing selected when the status is %s", async (_label, status) => {
      // Arrange
      req.body = { status };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
      expect(req.auditMetadata).toBeUndefined();
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errors: [{ text: "Select a status", href: "#status" }],
          statusItems: [
            { value: "PENDING", text: "Pending", selected: false },
            { value: "ACTIVE", text: "Active", selected: false },
            { value: "SUSPENDED", text: "Suspended", selected: false }
          ]
        })
      );
    });

    it("should re-render with the error when the request has no body", async () => {
      // Arrange
      req.body = undefined;

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ errors: [{ text: "Select a status", href: "#status" }] }));
    });

    it("should show the Welsh error when the status is missing in Welsh", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ errors: [{ text: "Dewiswch statws", href: "#status" }] }));
    });

    it("should redirect to the subscriber list without updating when the subscriber is not found", async () => {
      // Arrange
      req.body = { status: "ACTIVE" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
      expect(updateThirdPartyUserStatus).not.toHaveBeenCalled();
    });
  });
});

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: "Test Corp",
    status: "PENDING",
    createdAt: new Date("2026-01-15"),
    subscriptions: [],
    ...overrides
  } as never;
}
