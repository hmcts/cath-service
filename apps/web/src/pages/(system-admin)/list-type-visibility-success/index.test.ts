import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

const { requireRoleCalls } = vi.hoisted(() => ({ requireRoleCalls: [] as unknown[] }));

vi.mock("@hmcts/auth", () => ({
  requireRole: (roles: unknown) => {
    requireRoleCalls.push(roles);
    return (_req: Request, _res: Response, next: () => void) => next();
  },
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

const getHandler = GET[GET.length - 1];

describe("list-type-visibility-success page", () => {
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = { render: vi.fn(), setHeader: vi.fn(), locals: { locale: "en" } };
  });

  it("should render the hidden panel when state is hidden", async () => {
    // Arrange
    const req = { query: { state: "hidden" } } as unknown as Request;

    // Act
    await getHandler(req, res as Response, vi.fn());

    // Assert
    expect(res.render).toHaveBeenCalledWith(
      "list-type-visibility-success/index",
      expect.objectContaining({ title: en.successHiddenTitle, body: en.successHiddenBody, pageTitle: en.successHiddenTitle })
    );
  });

  it("should render the shown panel when state is visible", async () => {
    // Arrange
    const req = { query: { state: "visible" } } as unknown as Request;

    // Act
    await getHandler(req, res as Response, vi.fn());

    // Assert
    expect(res.render).toHaveBeenCalledWith(
      "list-type-visibility-success/index",
      expect.objectContaining({ title: en.successShownTitle, body: en.successShownBody })
    );
  });

  it("should render Welsh content when the saved locale is cy", async () => {
    // Arrange
    const req = { query: { state: "hidden" } } as unknown as Request;
    res.locals = { locale: "cy" };

    // Act
    await getHandler(req, res as Response, vi.fn());

    // Assert
    expect(res.render).toHaveBeenCalledWith("list-type-visibility-success/index", expect.objectContaining({ t: cy, title: cy.successHiddenTitle }));
  });

  it("should set no-store cache headers", async () => {
    // Arrange
    const req = { query: {} } as unknown as Request;

    // Act
    await getHandler(req, res as Response, vi.fn());

    // Assert
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
    expect(res.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
    expect(res.setHeader).toHaveBeenCalledWith("Expires", "0");
  });

  it("should require the SYSTEM_ADMIN role", () => {
    expect(requireRoleCalls).toEqual([["SYSTEM_ADMIN"]]);
    expect(GET).toHaveLength(2);
  });
});
