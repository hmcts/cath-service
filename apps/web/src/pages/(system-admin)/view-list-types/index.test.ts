import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "system-admin" }
}));

describe("view-list-types", () => {
  it("should redirect to /manage-list-types with 301", async () => {
    // Arrange
    const req = { query: {} } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    const handler = GET[GET.length - 1];

    // Act
    await handler(req, res, vi.fn());

    // Assert
    expect(res.redirect).toHaveBeenCalledWith(301, "/manage-list-types");
  });
});
