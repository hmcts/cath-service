import { errorViewsCy, errorViewsEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

describe("session-expiring page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const handler = GET as (req: Request, res: Response) => Promise<void>;

  function renderedOptions() {
    return vi.mocked(res.render as (view: string, options: Record<string, unknown>) => void).mock.calls[0][1];
  }

  beforeEach(() => {
    req = {
      query: { currentPath: "/subscription-management?lng=cy" },
      user: { id: "1", email: "user@example.com", displayName: "User", role: "VERIFIED", provenance: "CFT_IDAM" },
      isAuthenticated: vi.fn(() => true) as unknown as Request["isAuthenticated"]
    };
    res = { render: vi.fn(), status: vi.fn().mockReturnThis(), locals: { locale: "en" } };
  });

  it("should render the 400 error page without a sign-in redirect when not signed in", async () => {
    // Arrange
    req.isAuthenticated = vi.fn(() => false) as unknown as Request["isAuthenticated"];
    req.user = undefined;
    req.session = {} as Request["session"];

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", {
      en: errorViewsEn.errorCommon,
      cy: errorViewsCy.errorCommon,
      t: errorViewsEn.errorCommon
    });
    expect(req.session).not.toHaveProperty("returnTo");
  });

  it("should render the Welsh error page when not signed in with the cy locale", async () => {
    // Arrange
    req.isAuthenticated = vi.fn(() => false) as unknown as Request["isAuthenticated"];
    req.user = undefined;
    res.locals = { locale: "cy" };

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ t: errorViewsCy.errorCommon }));
  });

  it("should render the page with English content, the back link and the warning lead", async () => {
    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(res.render).toHaveBeenCalledWith(
      "session-expiring/index",
      expect.objectContaining({
        en,
        cy,
        t: en,
        back: en.backButton,
        warningLeadMs: 20 * 60 * 1000,
        isSessionExpiringPage: true
      })
    );
  });

  it("should use the Welsh content from res.locals.locale", async () => {
    // Arrange
    res.locals = { locale: "cy" };

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(renderedOptions()).toEqual(expect.objectContaining({ t: cy, back: cy.backButton }));
  });

  it("should link Continue to the validated current path", async () => {
    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(renderedOptions().continueHref).toBe("/subscription-management?lng=cy");
  });

  it.each([
    ["VERIFIED", "/account-home"],
    ["SYSTEM_ADMIN", "/system-admin-dashboard"],
    ["INTERNAL_ADMIN_CTSC", "/admin-dashboard"],
    ["INTERNAL_ADMIN_LOCAL", "/admin-dashboard"]
  ])("should fall back to the %s landing page for an unsafe current path", async (role, expected) => {
    // Arrange
    req.query = { currentPath: "//evil.example" };
    req.user = { ...req.user!, role };

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(renderedOptions().continueHref).toBe(expected);
  });

  it("should fall back when the current path is missing", async () => {
    // Arrange
    req.query = {};

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(renderedOptions().continueHref).toBe("/account-home");
  });

  it.each([
    ["CFT_IDAM", "CFT"],
    ["CRIME_IDAM", "CRIME"],
    ["PI_AAD", "AAD"],
    ["SSO", "SSO"]
  ])("should pass redirectType for %s as %s", async (provenance, expected) => {
    // Arrange
    req.user = { ...req.user!, provenance };

    // Act
    await handler(req as Request, res as Response);

    // Assert
    expect(renderedOptions().redirectType).toBe(expected);
  });
});
