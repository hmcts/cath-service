import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

import { getLocationWithDetails } from "@hmcts/location";

describe("location-metadata-search page", () => {
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
    it("should render search page with English content", async () => {
      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-search/index",
        expect.objectContaining({
          heading: "Find the location metadata to manage",
          errors: undefined
        })
      );
    });

    it("should render search page with Welsh content", async () => {
      req.query = { lng: "cy" };

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-search/index",
        expect.objectContaining({
          heading: "Dod o hyd i'r metadata lleoliad i'w reoli"
        })
      );
    });

    it("should display errors from session and clear them", async () => {
      const errors = [{ text: "Error message", href: "#location-search" }];
      req.session = { locationMetadataSearchErrors: errors } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-search/index",
        expect.objectContaining({
          errors
        })
      );
      expect((req.session as any).locationMetadataSearchErrors).toBeUndefined();
    });
  });

  describe("postHandler", () => {
    it("should redirect with error when location ID is empty", async () => {
      req.body = { locationId: "" };

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
      expect((req.session as any).locationMetadataSearchErrors).toEqual([expect.objectContaining({ href: "#location-search" })]);
    });

    it("should redirect with error when user typed but did not select from autocomplete", async () => {
      req.body = { locationId: "", "location-search-display": "Some Court Name" };

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
      expect((req.session as any).locationMetadataSearchErrors[0].text).toContain("no matching");
    });

    it("should redirect with error when location ID is not a valid number", async () => {
      req.body = { locationId: "invalid" };

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
      expect((req.session as any).locationMetadataSearchErrors).toEqual([expect.objectContaining({ href: "#location-search" })]);
    });

    it("should redirect with error when location not found", async () => {
      req.body = { locationId: "123" };
      (getLocationWithDetails as any).mockResolvedValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
      expect((req.session as any).locationMetadataSearchErrors).toEqual([expect.objectContaining({ href: "#location-search" })]);
    });

    it("should store location in session and redirect to manage page", async () => {
      req.body = { locationId: "123" };
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      await postHandler(req as Request, res as Response);

      expect((req.session as any).locationMetadata).toEqual({
        locationId: 123,
        locationName: "Test Court",
        locationWelshName: "Llys Prawf"
      });
      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-manage");
    });

    it("should redirect to manage page with Welsh language parameter", async () => {
      req.query = { lng: "cy" };
      req.body = { locationId: "123" };
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-manage?lng=cy");
    });

    it("should redirect with Welsh language parameter on error", async () => {
      req.query = { lng: "cy" };
      req.body = { locationId: "" };

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search?lng=cy");
    });
  });
});
