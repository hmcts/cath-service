import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    findAllThirdPartyUsers: vi.fn()
  };
});

import { findAllThirdPartyUsers } from "@hmcts/system-admin-pages";

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
    it("should render page with en and cy content and users", async () => {
      const mockUsers = [
        { id: "1", name: "User One", subscriptions: [] },
        { id: "2", name: "User Two", subscriptions: [{ listTypeId: 1 }] }
      ];
      (findAllThirdPartyUsers as any).mockResolvedValue(mockUsers);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(findAllThirdPartyUsers).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-users/index",
        expect.objectContaining({
          en: expect.objectContaining({ pageTitle: "Manage third party users" }),
          cy: expect.objectContaining({ pageTitle: "Rheoli defnyddiwr trydydd parti" }),
          users: mockUsers
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
          en: expect.any(Object),
          cy: expect.any(Object),
          users: []
        })
      );
    });
  });
});
