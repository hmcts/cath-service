import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/location", () => ({
  deleteLocationMetadata: vi.fn()
}));

vi.mock("../../delete-court/validation.js", () => ({
  validateRadioSelection: vi.fn()
}));

import { deleteLocationMetadata } from "@hmcts/location";
import { validateRadioSelection } from "../../delete-court/validation.js";

describe("location-metadata-delete-confirmation page", () => {
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
    it("should redirect to search page if no session data", async () => {
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
    });

    it("should redirect to search page with Welsh param if no session data", async () => {
      req.query = { lng: "cy" };
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search?lng=cy");
    });

    it("should render confirmation page with English content", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-delete-confirmation/index",
        expect.objectContaining({
          locationName: "Test Court",
          heading: "Are you sure you want to delete location metadata for",
          errors: undefined
        })
      );
    });

    it("should render confirmation page with Welsh content", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-delete-confirmation/index",
        expect.objectContaining({
          locationName: "Llys Prawf"
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to search page if no session data", async () => {
      req.session = {} as any;

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
    });

    it("should show error when no radio selected", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { confirmDelete: undefined };
      (validateRadioSelection as any).mockReturnValue({ href: "#confirm-delete" });

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-delete-confirmation/index",
        expect.objectContaining({
          errors: [expect.objectContaining({ href: "#confirm-delete" })]
        })
      );
    });

    it("should redirect to manage page when user selects no", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { confirmDelete: "no" };
      (validateRadioSelection as any).mockReturnValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-manage");
    });

    it("should redirect to manage page with Welsh param when user selects no", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { confirmDelete: "no" };
      (validateRadioSelection as any).mockReturnValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-manage?lng=cy");
    });

    it("should delete metadata and redirect to success page", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (deleteLocationMetadata as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(deleteLocationMetadata).toHaveBeenCalledWith(123);
      expect((req.session as any).locationMetadata.operation).toBe("deleted");
      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-success");
    });

    it("should redirect to success page with Welsh param", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (deleteLocationMetadata as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-success?lng=cy");
    });

    it("should show error when delete fails", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (deleteLocationMetadata as any).mockRejectedValue(new Error("Database error"));

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-delete-confirmation/index",
        expect.objectContaining({
          errors: [{ text: "Database error" }]
        })
      );
    });
  });
});
