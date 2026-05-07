import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "../../list-type/queries.js";
import { getHandler } from "./index.js";

vi.mock("../../list-type/queries.js");

const mockDbListTypes = [
  {
    id: 1,
    name: "CIVIL_DAILY_CAUSE_LIST",
    friendlyName: "Civil Daily Cause List",
    welshFriendlyName: null,
    shortenedFriendlyName: null,
    url: null,
    defaultSensitivity: null,
    allowedProvenance: "CFT_IDAM",
    isNonStrategic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    subJurisdictions: []
  },
  {
    id: 8,
    name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    friendlyName: "Civil and Family Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu",
    shortenedFriendlyName: null,
    url: null,
    defaultSensitivity: null,
    allowedProvenance: "CFT_IDAM",
    isNonStrategic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    subJurisdictions: []
  },
  {
    id: 3,
    name: "CRIME_DAILY_LIST",
    friendlyName: "Crime Daily List",
    welshFriendlyName: null,
    shortenedFriendlyName: null,
    url: null,
    defaultSensitivity: null,
    allowedProvenance: "CRIME_IDAM",
    isNonStrategic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    subJurisdictions: []
  }
];

describe("manage-list-types page", () => {
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

    vi.mocked(queries.findAllListTypes).mockResolvedValue(mockDbListTypes as any);
  });

  describe("GET", () => {
    it("should render manage-list-types page in English", async () => {
      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "manage-list-types/index",
        expect.objectContaining({
          pageTitle: "Manage list types",
          heading: "Manage list types",
          tableCaption: "List types",
          nameColumnHeading: "Name",
          configureLink: "Manage"
        })
      );
    });

    it("should render manage-list-types page in Welsh", async () => {
      req.query = { lng: "cy" };

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "manage-list-types/index",
        expect.objectContaining({
          pageTitle: "Rheoli mathau rhestr",
          heading: "Rheoli mathau rhestr",
          tableCaption: "Mathau rhestr",
          nameColumnHeading: "Enw",
          configureLink: "Rheoli"
        })
      );
    });

    it("should render list types in alphabetical order", async () => {
      await getHandler(req as Request, res as Response);

      const renderCall = (res.render as any).mock.calls[0];
      const listTypes = renderCall[1].listTypes;

      expect(listTypes).toBeDefined();
      expect(listTypes.length).toBeGreaterThan(0);

      for (let i = 0; i < listTypes.length - 1; i++) {
        expect(listTypes[i].name.localeCompare(listTypes[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it("should include list type IDs and configure URLs", async () => {
      await getHandler(req as Request, res as Response);

      const renderCall = (res.render as any).mock.calls[0];
      const listTypes = renderCall[1].listTypes;

      expect(listTypes).toBeDefined();
      expect(listTypes.length).toBeGreaterThan(0);

      listTypes.forEach((listType: any) => {
        expect(listType).toHaveProperty("id");
        expect(listType).toHaveProperty("name");
        expect(listType).toHaveProperty("configureUrl");
        expect(listType.configureUrl).toMatch(/^\/list-search-config\/\d+$/);
      });
    });

    it("should use the technical name when friendlyName is absent", async () => {
      vi.mocked(queries.findAllListTypes).mockResolvedValue([{ ...mockDbListTypes[0], friendlyName: null } as any]);

      await getHandler(req as Request, res as Response);

      const renderCall = (res.render as any).mock.calls[0];
      const listTypes = renderCall[1].listTypes;

      expect(listTypes[0].name).toBe("CIVIL_DAILY_CAUSE_LIST");
    });

    it("should map all db list types from findAllListTypes", async () => {
      await getHandler(req as Request, res as Response);

      const renderCall = (res.render as any).mock.calls[0];
      const listTypes = renderCall[1].listTypes;

      expect(listTypes.length).toBe(mockDbListTypes.length);
    });
  });
});
