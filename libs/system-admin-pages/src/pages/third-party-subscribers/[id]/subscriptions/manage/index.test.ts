import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  updateThirdPartySubscriptions: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findMany: vi.fn().mockResolvedValue([
        { id: 1, name: "CIVIL_DAILY_CAUSE_LIST" },
        { id: 2, name: "FAMILY_DAILY_CAUSE_LIST" }
      ])
    }
  }
}));

vi.mock("../../../../../feature-flags/launch-darkly.js", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false)
}));

import { findThirdPartyUserById, updateThirdPartySubscriptions } from "@hmcts/third-party-user";
import { isFeatureEnabled } from "../../../../../feature-flags/launch-darkly.js";

const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test Corp",
  createdAt: new Date(),
  subscriptions: [
    { id: "00000000-0000-0000-0000-000000000010", thirdPartyUserId: "00000000-0000-0000-0000-000000000001", listTypeId: 1, sensitivity: "PUBLIC" }
  ]
};

describe("third-party-subscribers subscriptions page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "00000000-0000-0000-0000-000000000001" }, user: { id: "admin-1" } as never };
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

    it("should render subscriptions page with radio buttons when LD flag is true", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(isFeatureEnabled).mockResolvedValue(true);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/subscriptions/manage/index",
        expect.objectContaining({
          useDropdown: false,
          pageTitle: "Manage subscriptions"
        })
      );
    });

    it("should render subscriptions page with dropdown when LD flag is false", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(isFeatureEnabled).mockResolvedValue(false);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith("third-party-subscribers/[id]/subscriptions/manage/index", expect.objectContaining({ useDropdown: true }));
    });

    it("should render subscriptions page in Welsh", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      (res as any).locals = { locale: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/subscriptions/manage/index",
        expect.objectContaining({ lngParam: "?lng=cy", pageTitle: "Rheoli tanysgrifiadau" })
      );
    });

    it("should indicate last page when on final page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.query = { page: "1" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/subscriptions/manage/index",
        expect.objectContaining({ isLastPage: true, currentPage: 1, totalPages: 1 })
      );
    });

    it("should initialise session with existing user subscriptions", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/subscriptions/manage/index",
        expect.objectContaining({ currentSubscriptions: { CIVIL_DAILY_CAUSE_LIST: "PUBLIC" } })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to users list when user not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
    });

    it("should save subscriptions and redirect to confirmation on last page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.session = { thirdPartySubscriptions: { userId: "00000000-0000-0000-0000-000000000001", pending: {} } } as never;
      req.body = { CIVIL_DAILY_CAUSE_LIST: "PUBLIC", FAMILY_DAILY_CAUSE_LIST: "PRIVATE" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001", {
        CIVIL_DAILY_CAUSE_LIST: "PUBLIC",
        FAMILY_DAILY_CAUSE_LIST: "PRIVATE"
      });
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/00000000-0000-0000-0000-000000000001/subscriptions/success");
    });

    it("should set audit metadata on save", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.session = { thirdPartySubscriptions: { userId: "00000000-0000-0000-0000-000000000001", pending: {} } } as never;
      req.body = { CIVIL_DAILY_CAUSE_LIST: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toMatchObject({
        shouldLog: true,
        action: "Update third party subscriptions"
      });
    });
  });
});
