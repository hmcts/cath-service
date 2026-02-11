import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("../../third-party-user/queries.js", () => ({
  findAllThirdPartyUsers: vi.fn(),
  getHighestSensitivity: vi.fn()
}));

import { findAllThirdPartyUsers, getHighestSensitivity } from "../../third-party-user/queries.js";

describe("manage-third-party-users page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {}
    };

    res = {
      render: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render page with users in English", async () => {
      const mockUsers = [
        { id: "1", name: "User One", subscriptions: [] },
        { id: "2", name: "User Two", subscriptions: [{ listTypeId: 1 }] }
      ];
      (findAllThirdPartyUsers as any).mockResolvedValue(mockUsers);
      (getHighestSensitivity as any).mockReturnValue("PUBLIC");

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(findAllThirdPartyUsers).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-users/index",
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({ id: "1", name: "User One", highestSensitivity: "PUBLIC" }),
            expect.objectContaining({ id: "2", name: "User Two", highestSensitivity: "PUBLIC" })
          ])
        })
      );
    });

    it("should render page in Welsh", async () => {
      req.query = { lng: "cy" };
      (findAllThirdPartyUsers as any).mockResolvedValue([]);
      (getHighestSensitivity as any).mockReturnValue(null);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-users/index",
        expect.objectContaining({
          users: []
        })
      );
    });

    it("should render page with empty users list", async () => {
      (findAllThirdPartyUsers as any).mockResolvedValue([]);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-users/index",
        expect.objectContaining({
          users: []
        })
      );
    });

    it("should calculate highest sensitivity for each user", async () => {
      const mockUsers = [{ id: "1", name: "User One", subscriptions: [{ listTypeId: 1, sensitivity: "CLASSIFIED" }] }];
      (findAllThirdPartyUsers as any).mockResolvedValue(mockUsers);
      (getHighestSensitivity as any).mockReturnValue("CLASSIFIED");

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(getHighestSensitivity).toHaveBeenCalledWith([{ listTypeId: 1, sensitivity: "CLASSIFIED" }]);
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-users/index",
        expect.objectContaining({
          users: expect.arrayContaining([expect.objectContaining({ highestSensitivity: "CLASSIFIED" })])
        })
      );
    });
  });
});
