import { requireRole } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET, getHandler, POST, postHandler } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => "require-role-middleware"),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  testThirdPartyConnection: vi.fn(),
  setSecret: vi.fn(),
  deleteSecrets: vi.fn()
}));

import { deleteSecrets, findThirdPartyUserById, setSecret, testThirdPartyConnection } from "@hmcts/third-party-user";

const requireRoleCalls = [...vi.mocked(requireRole).mock.calls];

const SUBSCRIBER_ID = "00000000-0000-0000-0000-000000000001";
const VIEW = "third-party-subscribers/[id]/manage/index";

function mockSubscriber() {
  vi.mocked(findThirdPartyUserById).mockResolvedValue({
    id: SUBSCRIBER_ID,
    name: "Test Corp",
    createdAt: new Date("2026-01-15"),
    subscriptions: [{ id: "s1", thirdPartyUserId: "user-1", listType: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "PUBLIC" }]
  } as never);
}

describe("third-party-subscribers manage user page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: {} as never,
      params: { id: SUBSCRIBER_ID },
      user: { id: "admin-1", email: "admin@justice.gov.uk", role: "SYSTEM_ADMIN", provenance: "azure-ad" } as never
    };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("getHandler", () => {
    it("should redirect to users list when user not found", async () => {
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
    });

    it("should render manage user page with user details and no connection result", async () => {
      mockSubscriber();

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        VIEW,
        expect.objectContaining({
          pageTitle: "Manage subscriber",
          name: "Test Corp",
          subscriptionCount: 1,
          testConnectionButton: "Test connection"
        })
      );
      expect(vi.mocked(res.render as never).mock.calls[0][1].connectionResult).toBeUndefined();
      expect(testThirdPartyConnection).not.toHaveBeenCalled();
    });

    it("should render with zero subscription count when no subscriptions", async () => {
      vi.mocked(findThirdPartyUserById).mockResolvedValue({
        id: SUBSCRIBER_ID,
        name: "Test Corp",
        createdAt: new Date(),
        subscriptions: []
      } as never);

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(VIEW, expect.objectContaining({ subscriptionCount: 0 }));
    });
  });

  describe("postHandler", () => {
    describe("unknown subscriber", () => {
      it("should redirect to the list and not test", async () => {
        vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

        await postHandler(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
        expect(testThirdPartyConnection).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
      });

      it("should keep the Welsh language on the redirect", async () => {
        vi.mocked(findThirdPartyUserById).mockResolvedValue(null);
        res.locals = { locale: "cy" };

        await postHandler(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers?lng=cy");
      });
    });

    describe("outcomes", () => {
      beforeEach(() => {
        mockSubscriber();
      });

      function renderedContext() {
        return vi.mocked(res.render as never).mock.calls[0][1];
      }

      it("should render the success banner and summary values", async () => {
        vi.mocked(testThirdPartyConnection).mockResolvedValue({ status: "success" });

        await postHandler(req as Request, res as Response);

        expect(testThirdPartyConnection).toHaveBeenCalledWith(SUBSCRIBER_ID);
        expect(res.render).toHaveBeenCalledWith(
          VIEW,
          expect.objectContaining({
            name: "Test Corp",
            subscriptionCount: 1,
            userId: SUBSCRIBER_ID,
            connectionResult: { isSuccess: true, title: "Succeeded", message: "Connection to third party succeeded." }
          })
        );
      });

      it.each([
        [
          "missing-configuration",
          { status: "missing-configuration" },
          "No OAuth configuration found. Please supply valid OAuth configuration to enable connection.",
          undefined
        ],
        ["token-failure", { status: "token-failure", reason: { kind: "http-status", status: 401 } }, "Failed to generate access token.", "HTTP status 401"],
        [
          "destination-failure",
          { status: "destination-failure", reason: { kind: "http-status", status: 500 } },
          "Failed to send request to destination.",
          "HTTP status 500"
        ],
        [
          "token-failure with invalid-token-response",
          { status: "token-failure", reason: { kind: "invalid-token-response" } },
          "Failed to generate access token.",
          "The token response did not contain an access token."
        ],
        [
          "destination-failure with invalid-url",
          { status: "destination-failure", reason: { kind: "invalid-url" } },
          "Failed to send request to destination.",
          "The URL is not valid."
        ],
        [
          "destination-failure with connection-failed",
          { status: "destination-failure", reason: { kind: "connection-failed" } },
          "Failed to send request to destination.",
          "Could not connect."
        ],
        ["error", { status: "error" }, "Error connecting to third party. Please try again later.", undefined]
      ])("should render a failed banner for %s", async (_label, result, message, reason) => {
        vi.mocked(testThirdPartyConnection).mockResolvedValue(result as never);

        await postHandler(req as Request, res as Response);

        expect(renderedContext().connectionResult).toEqual({ isSuccess: false, title: "Failed", message, ...(reason ? { reason } : {}) });
      });

      it("should render Welsh strings when the locale is cy", async () => {
        res.locals = { locale: "cy" };
        vi.mocked(testThirdPartyConnection).mockResolvedValue({ status: "token-failure", reason: { kind: "http-status", status: 401 } });

        await postHandler(req as Request, res as Response);

        const context = renderedContext();
        expect(context.connectionResult).toEqual({
          isSuccess: false,
          title: cy.connectionTest.failedTitle,
          message: cy.connectionTest.tokenFailure,
          reason: `${cy.connectionTest.reasons.httpStatus} 401`
        });
        expect(context.testConnectionButton).toBe(cy.testConnectionButton);
        expect(context.lngParam).toBe("?lng=cy");
        expect(context.connectionTest).toBe(cy.connectionTest);
      });

      it("should render the English strings by default", async () => {
        vi.mocked(testThirdPartyConnection).mockResolvedValue({ status: "success" });

        await postHandler(req as Request, res as Response);

        expect(renderedContext().connectionTest).toBe(en.connectionTest);
      });
    });

    describe("read-only and middleware safety", () => {
      beforeEach(() => {
        mockSubscriber();
        vi.mocked(testThirdPartyConnection).mockResolvedValue({ status: "error" });
      });

      it("should not put an errors key in the render context", async () => {
        await postHandler(req as Request, res as Response);

        expect(vi.mocked(res.render as never).mock.calls[0][1]).not.toHaveProperty("errors");
      });

      it("should opt out of the generic audit middleware entry so the test is not audited", async () => {
        await postHandler(req as Request, res as Response);

        expect(req.auditMetadata).toEqual({ shouldLog: false });
      });

      it("should not write or delete any secrets", async () => {
        await postHandler(req as Request, res as Response);

        expect(setSecret).not.toHaveBeenCalled();
        expect(deleteSecrets).not.toHaveBeenCalled();
      });
    });
  });

  describe("route exports", () => {
    it("should restrict GET and POST to system admins", () => {
      expect(requireRoleCalls).toEqual([[["SYSTEM_ADMIN"]], [["SYSTEM_ADMIN"]]]);
      expect(GET).toEqual(["require-role-middleware", getHandler]);
      expect(POST).toEqual(["require-role-middleware", postHandler]);
    });
  });
});
