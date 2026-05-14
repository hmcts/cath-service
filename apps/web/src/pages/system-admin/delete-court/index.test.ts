import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

// Mock dependencies
vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

vi.mock("../../delete-court/validation.js", () => ({
  validateLocationSelected: vi.fn()
}));

import { getLocationWithDetails } from "@hmcts/location";
import { validateLocationSelected } from "../../delete-court/validation.js";

describe("delete-court page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      body: {},
      session: {} as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("getHandler", () => {
    it("should render delete-court page in English", async () => {
      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court/index",
        expect.objectContaining({
          errors: undefined
        })
      );
    });

    it("should render delete-court page in Welsh", async () => {
      req.query = { lng: "cy" };

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court/index",
        expect.objectContaining({
          errors: undefined
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should show validation error when no location selected", async () => {
      req.body = { locationId: undefined };
      (validateLocationSelected as any).mockReturnValue({ href: "#court-search" });

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#court-search" })])
        })
      );
    });

    it("should show error when locationId is not a number", async () => {
      req.body = { locationId: "abc" };
      (validateLocationSelected as any).mockReturnValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#court-search" })])
        })
      );
    });

    it("should show error when location not found", async () => {
      req.body = { locationId: "123" };
      (validateLocationSelected as any).mockReturnValue(null);
      (getLocationWithDetails as any).mockResolvedValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#court-search" })])
        })
      );
    });

    it("should redirect to confirm page when location is valid", async () => {
      req.body = { locationId: "123" };
      req.session = {} as any;
      (validateLocationSelected as any).mockReturnValue(null);
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      await postHandler(req as Request, res as Response);

      expect(req.session).toHaveProperty("deleteCourt");
      expect((req.session as any).deleteCourt).toEqual({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      expect(res.redirect).toHaveBeenCalledWith("/delete-court-confirm");
    });

    it("should redirect to confirm page with Welsh locale", async () => {
      req.query = { lng: "cy" };
      req.body = { locationId: "123" };
      req.session = {} as any;
      (validateLocationSelected as any).mockReturnValue(null);
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court-confirm?lng=cy");
    });
  });
});
