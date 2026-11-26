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

import { prisma } from "@hmcts/postgres-prisma";
import { findThirdPartyUserById, updateThirdPartySubscriptions } from "@hmcts/third-party-user";
import { isFeatureEnabled } from "../../../../../feature-flags/launch-darkly.js";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";
const MANAGE_URL = `/third-party-subscribers/${USER_ID}/subscriptions/manage`;
const SUCCESS_URL = `/third-party-subscribers/${USER_ID}/subscriptions/success`;

function buildListTypes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `LIST_TYPE_${String(index + 1).padStart(2, "0")}`
  }));
}

function mockTwoPagesOfListTypes() {
  vi.mocked(prisma.listType.findMany).mockResolvedValueOnce(buildListTypes(25) as never);
}

function buildUserWithSubscriptions(subscriptions: { listTypeId: number; sensitivity: string }[]) {
  return {
    ...mockUser,
    subscriptions: subscriptions.map((sub, index) => ({ id: `sub-${index}`, thirdPartyUserId: USER_ID, ...sub }))
  };
}

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

    it("should clamp the page to the last page when the requested page is beyond totalPages", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "5" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      const renderData = vi.mocked(res.render!).mock.calls[0][1] as Record<string, unknown>;
      expect(renderData).toMatchObject({ isLastPage: true, currentPage: 2, totalPages: 2, pageOf: "Page 2 of 2" });
      expect(renderData.listTypes).toHaveLength(5);
    });

    it("should indicate a page that is not the last when there are more pages", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/subscriptions/manage/index",
        expect.objectContaining({ isLastPage: false, currentPage: 1, totalPages: 2 })
      );
    });

    it("should treat zero list types as a single last page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.listType.findMany).mockResolvedValueOnce([] as never);

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
      req.session = { thirdPartySubscriptions: { userId: USER_ID, pending: {} } } as never;
      req.body = { action: "save", CIVIL_DAILY_CAUSE_LIST: "PUBLIC", FAMILY_DAILY_CAUSE_LIST: "PRIVATE" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith(USER_ID, {
        CIVIL_DAILY_CAUSE_LIST: "PUBLIC",
        FAMILY_DAILY_CAUSE_LIST: "PRIVATE"
      });
      expect(res.redirect).toHaveBeenCalledWith(SUCCESS_URL);
    });

    it("should set audit metadata on save", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.session = { thirdPartySubscriptions: { userId: USER_ID, pending: {} } } as never;
      req.body = { action: "save", CIVIL_DAILY_CAUSE_LIST: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toMatchObject({
        shouldLog: true,
        action: "Update third party subscriptions"
      });
    });

    it("should store selections in the session and go to the next page without saving when action is next", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };
      req.session = { thirdPartySubscriptions: { userId: USER_ID, pending: { LIST_TYPE_01: "PUBLIC", LIST_TYPE_02: "PRIVATE" } } } as never;
      req.body = { action: "next", LIST_TYPE_01: "CLASSIFIED", LIST_TYPE_02: "UNSELECTED" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`${MANAGE_URL}?page=2`);
      expect(updateThirdPartySubscriptions).not.toHaveBeenCalled();
      expect((req.session as never as { thirdPartySubscriptions: { pending: Record<string, string> } }).thirdPartySubscriptions.pending).toEqual({
        LIST_TYPE_01: "CLASSIFIED"
      });
    });

    it("should keep the Welsh language when going to the next page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      (res as any).locals = { locale: "cy" };
      req.query = { page: "1" };
      req.body = { action: "next" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`${MANAGE_URL}?page=2&lng=cy`);
      expect(updateThirdPartySubscriptions).not.toHaveBeenCalled();
    });

    it("should stay on the last page without saving when action is next on the last page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "2" };
      req.body = { action: "next" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`${MANAGE_URL}?page=2`);
      expect(updateThirdPartySubscriptions).not.toHaveBeenCalled();
    });

    it("should save the current page merged with pending values from other pages when saving from a page that is not the last", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };
      req.session = { thirdPartySubscriptions: { userId: USER_ID, pending: { LIST_TYPE_01: "PUBLIC", LIST_TYPE_21: "CLASSIFIED" } } } as never;
      req.body = { action: "save", LIST_TYPE_01: "PRIVATE", LIST_TYPE_02: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith(USER_ID, {
        LIST_TYPE_01: "PRIVATE",
        LIST_TYPE_02: "PUBLIC",
        LIST_TYPE_21: "CLASSIFIED"
      });
      expect(res.redirect).toHaveBeenCalledWith(SUCCESS_URL);
      expect(req.auditMetadata).toMatchObject({ shouldLog: true, action: "Update third party subscriptions" });
      expect(req.session).not.toHaveProperty("thirdPartySubscriptions");
    });

    it("should keep existing subscriptions on unvisited pages when saving with no session", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(
        buildUserWithSubscriptions([
          { listTypeId: 1, sensitivity: "PUBLIC" },
          { listTypeId: 22, sensitivity: "PRIVATE" }
        ]) as never
      );
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };
      req.body = { action: "save", LIST_TYPE_01: "CLASSIFIED" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith(USER_ID, {
        LIST_TYPE_01: "CLASSIFIED",
        LIST_TYPE_22: "PRIVATE"
      });
    });

    it("should re-seed from the subscriber's subscriptions when the session belongs to another subscriber", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(buildUserWithSubscriptions([{ listTypeId: 22, sensitivity: "PRIVATE" }]) as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };
      req.session = { thirdPartySubscriptions: { userId: OTHER_USER_ID, pending: { LIST_TYPE_23: "PUBLIC" } } } as never;
      req.body = { action: "save" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith(USER_ID, { LIST_TYPE_22: "PRIVATE" });
    });

    it("should go to the next page without saving when no action is sent on a page that is not the last", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };
      req.body = { LIST_TYPE_01: "PUBLIC" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`${MANAGE_URL}?page=2`);
      expect(updateThirdPartySubscriptions).not.toHaveBeenCalled();
    });

    it("should save when no action is sent on the last page", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.session = { thirdPartySubscriptions: { userId: USER_ID, pending: {} } } as never;
      req.body = { CIVIL_DAILY_CAUSE_LIST: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith(USER_ID, { CIVIL_DAILY_CAUSE_LIST: "PUBLIC" });
      expect(res.redirect).toHaveBeenCalledWith(SUCCESS_URL);
    });

    it("should treat an unrecognised action like a missing action", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "1" };
      req.body = { action: "delete" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`${MANAGE_URL}?page=2`);
      expect(updateThirdPartySubscriptions).not.toHaveBeenCalled();
    });

    it("should redirect to the Welsh success page when saving in Welsh", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      (res as any).locals = { locale: "cy" };
      req.query = { page: "1" };
      req.body = { action: "save" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`${SUCCESS_URL}?lng=cy`);
    });

    it("should clamp a page beyond totalPages to the last page before saving", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      mockTwoPagesOfListTypes();
      req.query = { page: "9" };
      req.session = { thirdPartySubscriptions: { userId: USER_ID, pending: {} } } as never;
      req.body = { action: "save", LIST_TYPE_21: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith(USER_ID, { LIST_TYPE_21: "PUBLIC" });
    });
  });
});
