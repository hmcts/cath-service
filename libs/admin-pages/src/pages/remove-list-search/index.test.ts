import * as locationModule from "@hmcts/location";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/location");

const mockGetLocationById = vi.fn();
vi.mocked(locationModule).getLocationById = mockGetLocationById;

describe("remove-list-search page", () => {
  describe("GET handler", () => {
    it("should render the page with empty fields", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        session: {}
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith("remove-list-search/index", {
        pageTitle: expect.any(String),
        heading: expect.any(String),
        searchLabel: expect.any(String),
        searchHint: expect.any(String),
        continueButton: expect.any(String),
        locationId: "",
        locationName: "",
        hideLanguageToggle: true
      });
    });
  });

  describe("POST handler", () => {
    it("should show error when no location is provided", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        body: { locationId: "" },
        session: {}
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              href: "#locationId"
            })
          ])
        })
      );
    });

    it("should redirect to search results when valid location is provided", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      const mockReq = {
        query: {},
        body: { locationId: "1" },
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockReq.session.removalData).toEqual({
        locationId: "1",
        locationName: "Test Court",
        selectedArtefacts: []
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-search-results");
    });
  });
});
