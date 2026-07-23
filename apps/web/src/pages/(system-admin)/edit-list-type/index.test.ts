import * as queries from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import type { Session } from "express-session";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as _GET, POST as _POST } from "./index.js";

const getHandler = _GET[_GET.length - 1];
const postHandler = _POST[_POST.length - 1];

vi.mock("@hmcts/system-admin-pages");

const mockListType = {
  id: 1,
  name: "TEST_LIST",
  friendlyName: "Test List",
  welshFriendlyName: "Rhestr Prawf",
  shortenedFriendlyName: "Test",
  url: "/test",
  caseNumberJsonFieldName: "caseNo",
  caseNameJsonFieldName: "caseName",
  defaultSensitivity: "Public",
  allowedProvenance: "CFT_IDAM",
  isNonStrategic: false,
  deletedAt: null,
  subJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1, name: "Civil", welshName: "Sifil", jurisdictionId: 1 } }]
};

describe("edit-list-type page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let session: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    session = {};

    req = {
      query: { id: "1" },
      body: {},
      session: session as unknown as Session
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("GET", () => {
    it("should load from DB and populate session when no matching session exists", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue(mockListType as any);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(queries.findListTypeById).toHaveBeenCalledWith(1);
      expect(session.configureListType).toMatchObject({
        name: "TEST_LIST",
        caseNumberJsonFieldName: "caseNo",
        caseNameJsonFieldName: "caseName",
        editId: 1
      });
      expect(res.render).toHaveBeenCalledWith(
        "edit-list-type/index",
        expect.objectContaining({
          t: expect.objectContaining({ title: "Edit list type" }),
          data: expect.objectContaining({ name: "TEST_LIST", editId: 1 })
        })
      );
    });

    it("should use session data when editId matches", async () => {
      // Arrange
      session.configureListType = { name: "SESSION_DATA", editId: 1, caseNumberJsonFieldName: "override" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(queries.findListTypeById).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "edit-list-type/index",
        expect.objectContaining({
          data: expect.objectContaining({ name: "SESSION_DATA" })
        })
      );
    });

    it("should return 400 when id is missing", async () => {
      // Arrange
      req.query = {};

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 when list type not found", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("POST", () => {
    const validBody = {
      name: "UPDATED_LIST",
      friendlyName: "Updated List",
      welshFriendlyName: "Rhestr Diweddaraf",
      shortenedFriendlyName: "Updated",
      url: "/updated",
      caseNumberJsonFieldName: "newCaseNo",
      caseNameJsonFieldName: "newCaseName",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: "false"
    };

    it("should update session preserving editId and redirect on valid submission", async () => {
      // Arrange
      req.body = validBody;
      session.configureListType = { subJurisdictionIds: [1, 2], editId: 1 };
      vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(session.configureListType).toMatchObject({
        name: "UPDATED_LIST",
        caseNumberJsonFieldName: "newCaseNo",
        caseNameJsonFieldName: "newCaseName",
        subJurisdictionIds: [1, 2],
        editId: 1
      });
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-select-sub-jurisdictions");
    });

    it("should allow same name when updating own list type", async () => {
      // Arrange
      req.body = validBody;
      vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 1, name: "UPDATED_LIST" } as any);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-select-sub-jurisdictions");
    });

    it("should re-render with duplicate name error when name belongs to different list type", async () => {
      // Arrange
      req.body = validBody;
      vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 99, name: "UPDATED_LIST" } as any);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "edit-list-type/index",
        expect.objectContaining({
          errors: expect.objectContaining({ name: { text: "A list type with this name already exists" } })
        })
      );
    });

    it("should load subJurisdictionIds from DB when session is cold", async () => {
      // Arrange
      req.body = validBody;
      session.configureListType = undefined;
      vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);
      vi.mocked(queries.findListTypeById).mockResolvedValue(mockListType as any);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(queries.findListTypeById).toHaveBeenCalledWith(1);
      expect(session.configureListType).toMatchObject({
        subJurisdictionIds: [1],
        editId: 1
      });
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-select-sub-jurisdictions");
    });

    it("should return 400 when id is missing", async () => {
      // Arrange
      req.query = {};

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
