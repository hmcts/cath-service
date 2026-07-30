import * as queries from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as _GET } from "./index.js";

const getHandler = _GET[_GET.length - 1];

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
  subJurisdictions: [
    {
      subJurisdiction: {
        subJurisdictionId: 1,
        name: "Civil",
        welshName: "Sifil",
        jurisdictionId: 1
      }
    }
  ]
};

describe("manage-list-type page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: { id: "1" }
    };

    res = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("GET", () => {
    it("should render manage-list-type page with list type details", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue(mockListType as any);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(queries.findListTypeById).toHaveBeenCalledWith(1);
      expect(res.render).toHaveBeenCalledWith(
        "manage-list-type/index",
        expect.objectContaining({
          listType: mockListType,
          subJurisdictionsText: "Civil"
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
      expect(res.render).toHaveBeenCalledWith("errors/common", { status: 400 });
    });

    it("should return 400 when id is not numeric", async () => {
      // Arrange
      req.query = { id: "abc" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", { status: 400 });
    });

    it("should return 404 when list type is not found", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/common", { status: 404 });
    });

    it("should display Welsh sub-jurisdiction names in Welsh locale", async () => {
      // Arrange
      req.query = { id: "1", lng: "cy" };
      vi.mocked(queries.findListTypeById).mockResolvedValue(mockListType as any);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "manage-list-type/index",
        expect.objectContaining({
          subJurisdictionsText: "Sifil"
        })
      );
    });

    it("should show noneSelected text when no sub-jurisdictions linked", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue({
        ...mockListType,
        subJurisdictions: []
      } as any);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "manage-list-type/index",
        expect.objectContaining({
          subJurisdictionsText: "None selected"
        })
      );
    });
  });
});
