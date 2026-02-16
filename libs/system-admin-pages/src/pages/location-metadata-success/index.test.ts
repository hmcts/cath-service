import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

describe("location-metadata-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      session: {} as any
    };

    res = {
      render: vi.fn()
    };
  });

  describe("getHandler", () => {
    it("should render success page with created title when operation is created", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf",
          operation: "created"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-success/index",
        expect.objectContaining({
          pageTitle: "Location metadata created"
        })
      );
      expect((req.session as any).locationMetadata).toBeUndefined();
    });

    it("should render success page with updated title when operation is updated", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf",
          operation: "updated"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-success/index",
        expect.objectContaining({
          pageTitle: "Location metadata updated"
        })
      );
    });

    it("should render success page with deleted title when operation is deleted", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf",
          operation: "deleted"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-success/index",
        expect.objectContaining({
          pageTitle: "Location metadata deleted"
        })
      );
    });

    it("should default to created title when no operation specified", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-success/index",
        expect.objectContaining({
          pageTitle: "Location metadata created"
        })
      );
    });

    it("should default to created title when no session data", async () => {
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-success/index",
        expect.objectContaining({
          pageTitle: "Location metadata created"
        })
      );
    });

    it("should render with Welsh content when language is Welsh", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf",
          operation: "created"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-success/index",
        expect.objectContaining({
          pageTitle: "Metadata lleoliad wedi'i greu"
        })
      );
    });

    it("should clear session after rendering", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf",
          operation: "created"
        }
      } as any;

      await getHandler(req as Request, res as Response);

      expect((req.session as any).locationMetadata).toBeUndefined();
    });
  });
});
