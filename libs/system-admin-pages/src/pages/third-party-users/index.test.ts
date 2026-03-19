import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findAllThirdPartyUsers: vi.fn()
}));

import { findAllThirdPartyUsers } from "@hmcts/third-party-user";

describe("third-party-users list page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should render the page with a list of users", async () => {
      // Arrange
      const mockUsers = [{ id: "1", name: "Test User", createdAt: new Date("2026-01-01"), _count: { subscriptions: 2 } }];
      vi.mocked(findAllThirdPartyUsers).mockResolvedValue(mockUsers as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/index",
        expect.objectContaining({
          pageTitle: "Manage third party users",
          users: [{ id: "1", name: "Test User", createdAt: "01/01/2026" }],
          lngParam: ""
        })
      );
    });

    it("should render in Welsh when lng=cy query param is set", async () => {
      // Arrange
      req.query = { lng: "cy" };
      vi.mocked(findAllThirdPartyUsers).mockResolvedValue([]);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/index",
        expect.objectContaining({
          pageTitle: "Rheoli defnyddwyr trydydd parti",
          lngParam: "?lng=cy"
        })
      );
    });

    it("should render with empty users list when no users exist", async () => {
      // Arrange
      vi.mocked(findAllThirdPartyUsers).mockResolvedValue([]);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith("third-party-users/index", expect.objectContaining({ users: [] }));
    });
  });
});
