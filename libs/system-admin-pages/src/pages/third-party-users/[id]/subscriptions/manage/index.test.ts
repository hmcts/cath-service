import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  updateThirdPartySubscriptions: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 1,
      name: "CIVIL_DAILY_CAUSE_LIST",
      englishFriendlyName: "Civil Daily Cause List",
      welshFriendlyName: "Civil Daily Cause List",
      provenance: "CFT_IDAM",
      isNonStrategic: false
    },
    {
      id: 2,
      name: "FAMILY_DAILY_CAUSE_LIST",
      englishFriendlyName: "Family Daily Cause List",
      welshFriendlyName: "Family Daily Cause List",
      provenance: "CFT_IDAM",
      isNonStrategic: false
    }
  ]
}));

vi.mock("../../../../../feature-flags/launch-darkly.js", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false)
}));

import { findThirdPartyUserById, updateThirdPartySubscriptions } from "@hmcts/third-party-user";
import { isFeatureEnabled } from "../../../../../feature-flags/launch-darkly.js";

const mockUser = {
  id: "user-1",
  name: "Test Corp",
  createdAt: new Date(),
  subscriptions: [{ id: "s1", thirdPartyUserId: "user-1", listType: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "PUBLIC" }]
};

describe("third-party-users subscriptions page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "user-1" }, user: { id: "admin-1" } as never };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should redirect to users list when user not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users");
    });

    it("should render subscriptions page with radio buttons when LD flag is true", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(isFeatureEnabled).mockResolvedValue(true);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/subscriptions/manage/index",
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
      expect(res.render).toHaveBeenCalledWith("third-party-users/[id]/subscriptions/manage/index", expect.objectContaining({ useDropdown: true }));
    });

    it("should render subscriptions page in Welsh", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.query = { lng: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/subscriptions/manage/index",
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
        "third-party-users/[id]/subscriptions/manage/index",
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
        "third-party-users/[id]/subscriptions/manage/index",
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
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users");
    });

    it("should save subscriptions and redirect to confirmation on last page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.session = { thirdPartySubscriptions: { userId: "user-1", pending: {} } } as never;
      req.body = { CIVIL_DAILY_CAUSE_LIST: "PUBLIC", FAMILY_DAILY_CAUSE_LIST: "PRIVATE" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-1", { CIVIL_DAILY_CAUSE_LIST: "PUBLIC", FAMILY_DAILY_CAUSE_LIST: "PRIVATE" });
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/user-1/subscriptions/success");
    });

    it("should set audit metadata on save", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.session = { thirdPartySubscriptions: { userId: "user-1", pending: {} } } as never;
      req.body = { CIVIL_DAILY_CAUSE_LIST: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toMatchObject({
        shouldLog: true,
        action: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS"
      });
    });
  });
});
