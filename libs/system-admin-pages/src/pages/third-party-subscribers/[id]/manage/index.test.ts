import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn()
}));

import { findThirdPartyUserById } from "@hmcts/third-party-user";

describe("third-party-subscribers manage user page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "00000000-0000-0000-0000-000000000001" } };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("getHandler", () => {
    it("should redirect to users list when user not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
    });

    it("should render manage user page with user details", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        name: "Test Corp",
        createdAt: new Date("2026-01-15"),
        subscriptions: [{ id: "s1", thirdPartyUserId: "user-1", listType: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "PUBLIC" }]
      } as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/manage/index",
        expect.objectContaining({
          pageTitle: "Manage subscriber",
          name: "Test Corp",
          subscriptionCount: 1
        })
      );
    });

    it("should render with zero subscription count when no subscriptions", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        name: "Test Corp",
        createdAt: new Date(),
        subscriptions: []
      } as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith("third-party-subscribers/[id]/manage/index", expect.objectContaining({ subscriptionCount: 0 }));
    });
  });
});
