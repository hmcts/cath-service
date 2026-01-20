import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

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

      // Verify alphabetical order
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

    it("should map all mock list types", async () => {
      await getHandler(req as Request, res as Response);

      const renderCall = (res.render as any).mock.calls[0];
      const listTypes = renderCall[1].listTypes;

      // We expect 9 list types from mock-list-types.ts
      expect(listTypes.length).toBe(9);
    });
  });
});
