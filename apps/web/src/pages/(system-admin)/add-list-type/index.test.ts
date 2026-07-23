import * as queries from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import type { Session } from "express-session";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as _GET, POST as _POST } from "./index.js";

const getHandler = _GET[_GET.length - 1];
const postHandler = _POST[_POST.length - 1];

vi.mock("@hmcts/system-admin-pages");

describe("add-list-type page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let session: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    session = {};

    req = {
      query: {},
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
    it("should clear session and render empty form", async () => {
      // Arrange
      session.configureListType = { name: "OLD_DATA" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(session.configureListType).toBeUndefined();
      expect(res.render).toHaveBeenCalledWith(
        "add-list-type/index",
        expect.objectContaining({
          t: expect.objectContaining({ title: "Enter list type details" }),
          data: {},
          checkedProvenance: { CFT_IDAM: false, PI_AAD: false, CRIME_IDAM: false }
        })
      );
    });

    it("should render Welsh content when locale is cy", async () => {
      // Arrange
      req.query = { lng: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "add-list-type/index",
        expect.objectContaining({
          t: expect.objectContaining({ continueButton: "Parhau" })
        })
      );
    });
  });

  describe("POST", () => {
    const validBody = {
      name: "NEW_LIST_TYPE",
      friendlyName: "New List Type",
      welshFriendlyName: "Math Rhestr Newydd",
      shortenedFriendlyName: "New List",
      url: "/new-list",
      caseNumberJsonFieldName: "caseNo",
      caseNameJsonFieldName: "caseName",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: "false"
    };

    it("should store session data and redirect on valid submission", async () => {
      // Arrange
      req.body = validBody;
      vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(session.configureListType).toMatchObject({
        name: "NEW_LIST_TYPE",
        caseNumberJsonFieldName: "caseNo",
        caseNameJsonFieldName: "caseName",
        subJurisdictionIds: [],
        editId: undefined
      });
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-select-sub-jurisdictions");
    });

    it("should re-render with errors when validation fails", async () => {
      // Arrange
      req.body = { ...validBody, name: "" };
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([{ field: "name", message: "Enter a value for name", href: "#name" }]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "add-list-type/index",
        expect.objectContaining({
          errors: expect.objectContaining({ name: { text: "Enter a value for name" } }),
          errorList: expect.any(Array)
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should re-render with duplicate name error when name already exists", async () => {
      // Arrange
      req.body = validBody;
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);
      vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 99, name: "NEW_LIST_TYPE" } as any);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "add-list-type/index",
        expect.objectContaining({
          errors: expect.objectContaining({ name: { text: "A list type with this name already exists" } })
        })
      );
    });

    it("should handle single string for allowedProvenance", async () => {
      // Arrange
      req.body = { ...validBody, allowedProvenance: "CFT_IDAM" };
      vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(session.configureListType).toMatchObject({
        allowedProvenance: ["CFT_IDAM"]
      });
    });

    it("should set null for empty optional JSON field names", async () => {
      // Arrange
      req.body = { ...validBody, caseNumberJsonFieldName: "", caseNameJsonFieldName: "" };
      vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
      vi.mocked(queries.validateListTypeDetails).mockReturnValue([]);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(session.configureListType).toMatchObject({
        caseNumberJsonFieldName: null,
        caseNameJsonFieldName: null
      });
    });
  });
});
