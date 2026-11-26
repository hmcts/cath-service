import { findListTypeById, setListTypeVisibility } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET, POST } from "./index.js";

const { requireRoleCalls } = vi.hoisted(() => ({ requireRoleCalls: [] as unknown[] }));

vi.mock("@hmcts/auth", () => ({
  requireRole: (roles: unknown) => {
    requireRoleCalls.push(roles);
    return (_req: Request, _res: Response, next: () => void) => next();
  },
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/system-admin-pages")>("@hmcts/system-admin-pages");
  return {
    AuditLogAction: actual.AuditLogAction,
    validateVisibilityConfirmation: actual.validateVisibilityConfirmation,
    findListTypeById: vi.fn(),
    setListTypeVisibility: vi.fn()
  };
});

const getHandler = GET[GET.length - 1];
const postHandler = POST[POST.length - 1];
const TEMPLATE = "list-type-visibility/index";

function buildListType(overrides = {}) {
  return {
    id: 7,
    name: "CIVIL_DAILY_CAUSE_LIST",
    friendlyName: "Civil Daily Cause List",
    isHidden: false,
    deletedAt: null,
    ...overrides
  };
}

describe("list-type-visibility page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: { id: "7" }, body: {} };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      locals: { locale: "en" }
    };
    vi.mocked(findListTypeById).mockResolvedValue(buildListType() as any);
  });

  it("should restrict GET and POST to the SYSTEM_ADMIN role", () => {
    expect(requireRoleCalls).toEqual([["SYSTEM_ADMIN"], ["SYSTEM_ADMIN"]]);
    expect(GET).toHaveLength(2);
    expect(POST).toHaveLength(2);
  });

  describe("GET", () => {
    it("should render the hide question when the list type is visible", async () => {
      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          t: en,
          id: 7,
          title: en.hideTitle,
          pageTitle: en.hideTitle,
          hint: en.hideHint,
          listTypeName: "Civil Daily Cause List",
          isHidden: false,
          targetState: "hidden",
          errors: undefined
        })
      );
    });

    it("should render the show question when the list type is hidden", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(buildListType({ isHidden: true }) as any);

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ title: en.showTitle, hint: en.showHint, isHidden: true, targetState: "visible" })
      );
    });

    it("should use the technical name when there is no friendly name", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(buildListType({ friendlyName: null }) as any);

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ listTypeName: "CIVIL_DAILY_CAUSE_LIST" }));
    });

    it("should render Welsh content when the saved locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ t: cy, title: cy.hideTitle }));
    });

    it.each([{}, { id: "abc" }, { id: "7abc" }])("should return 400 when id is invalid (%o)", async (query) => {
      // Arrange
      req.query = query;

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", { status: 400 });
      expect(findListTypeById).not.toHaveBeenCalled();
    });

    it("should return 404 when the list type does not exist", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", { status: 404 });
    });

    it("should return 404 when the list type is soft-deleted", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(buildListType({ deletedAt: new Date() }) as any);

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("POST", () => {
    it("should return 400 when id is invalid", async () => {
      // Arrange
      req.query = { id: "abc" };
      req.body = { targetState: "hidden", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(setListTypeVisibility).not.toHaveBeenCalled();
    });

    it("should return 400 when targetState is missing or invalid", async () => {
      // Arrange
      req.body = { targetState: "deleted", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(setListTypeVisibility).not.toHaveBeenCalled();
    });

    it("should return 404 when the list type does not exist", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(null);
      req.body = { targetState: "hidden", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(setListTypeVisibility).not.toHaveBeenCalled();
    });

    it("should re-render with an error when no option is selected", async () => {
      // Arrange
      req.body = { targetState: "hidden" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errors: [{ text: en.errorHideConfirmationRequired, href: "#confirmVisibility" }],
          fieldError: en.errorHideConfirmationRequired,
          pageTitle: `${en.errorPrefix} ${en.hideTitle}`
        })
      );
      expect(setListTypeVisibility).not.toHaveBeenCalled();
      expect(req.auditMetadata).toBeUndefined();
    });

    it("should use the show error message when showing a hidden list type", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(buildListType({ isHidden: true }) as any);
      req.body = { targetState: "visible" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ fieldError: en.errorShowConfirmationRequired }));
    });

    it("should redirect back to the list type without changing it when No is selected", async () => {
      // Arrange
      req.body = { targetState: "hidden", confirmVisibility: "no" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/manage-list-type?id=7");
      expect(setListTypeVisibility).not.toHaveBeenCalled();
      expect(req.auditMetadata).toBeUndefined();
    });

    it("should hide the list type, set audit metadata and redirect to the success page", async () => {
      // Arrange
      vi.mocked(setListTypeVisibility).mockResolvedValue("UPDATED");
      req.body = { targetState: "hidden", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(setListTypeVisibility).toHaveBeenCalledWith(7, true);
      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "Hide list type",
        entityInfo: "Name: CIVIL_DAILY_CAUSE_LIST, ID: 7"
      });
      expect(res.redirect).toHaveBeenCalledWith("/list-type-visibility-success?state=hidden");
    });

    it("should show the list type and redirect to the success page", async () => {
      // Arrange
      vi.mocked(findListTypeById).mockResolvedValue(buildListType({ isHidden: true }) as any);
      vi.mocked(setListTypeVisibility).mockResolvedValue("UPDATED");
      req.body = { targetState: "visible", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(setListTypeVisibility).toHaveBeenCalledWith(7, false);
      expect(req.auditMetadata?.action).toBe("Show list type");
      expect(res.redirect).toHaveBeenCalledWith("/list-type-visibility-success?state=visible");
    });

    it("should honour the posted target state rather than flipping the current state", async () => {
      // Arrange — another admin hid it after this page was loaded with "hide" wording
      vi.mocked(findListTypeById).mockResolvedValue(buildListType({ isHidden: true }) as any);
      vi.mocked(setListTypeVisibility).mockResolvedValue("ALREADY_IN_STATE");
      req.body = { targetState: "hidden", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(setListTypeVisibility).toHaveBeenCalledWith(7, true);
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errors: [{ text: en.errorAlreadyHidden }],
          fieldError: undefined,
          isHidden: true,
          targetState: "visible",
          title: en.showTitle,
          data: { confirmVisibility: undefined }
        })
      );
      expect(req.auditMetadata).toBeUndefined();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should show the already-visible error when showing a visible list type", async () => {
      // Arrange
      vi.mocked(setListTypeVisibility).mockResolvedValue("ALREADY_IN_STATE");
      req.body = { targetState: "visible", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ errors: [{ text: en.errorAlreadyVisible }], fieldError: undefined, isHidden: false, targetState: "hidden" })
      );
    });

    it("should return 404 when the list type disappears before the update", async () => {
      // Arrange
      vi.mocked(setListTypeVisibility).mockResolvedValue("NOT_FOUND");
      req.body = { targetState: "hidden", confirmVisibility: "yes" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(req.auditMetadata).toBeUndefined();
    });
  });
});
