import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

// Mock @hmcts/location to prevent database connections
vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        locationId: 1,
        name: "Oxford Combined Court Centre",
        welshName: "Canolfan Llysoedd Cyfun Rhydychen",
        regions: [3],
        subJurisdictions: [1, 2]
      });
    }
    return Promise.resolve(undefined);
  })
}));

import { GET, POST } from "./index.js";

const NO_STORE = "private, max-age=0, no-cache, no-store, must-revalidate";

function buildResponse(locale = "en") {
  return {
    render: vi.fn(),
    redirect: vi.fn(),
    setHeader: vi.fn(),
    locals: { locale }
  } as unknown as Response;
}

describe("search page", () => {
  describe("GET", () => {
    it("should render search page without preselected location", async () => {
      const req = { query: {} } as unknown as Request;
      const res = buildResponse();

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search/index",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          preselectedLocation: undefined,
          locale: "en"
        })
      );
    });

    it("should render search page with preselected location when locationId query param is provided", async () => {
      const req = { query: { locationId: "1" } } as unknown as Request;
      const res = buildResponse();

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search/index",
        expect.objectContaining({
          preselectedLocation: {
            id: 1,
            name: "Oxford Combined Court Centre",
            welshName: "Canolfan Llysoedd Cyfun Rhydychen"
          },
          locale: "en"
        })
      );
    });

    it("should render search page without preselected location for invalid locationId", async () => {
      const req = { query: { locationId: "999" } } as unknown as Request;
      const res = buildResponse();

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("search/index", expect.objectContaining({ preselectedLocation: undefined }));
    });

    it("should stop the browser caching the page so Back fetches a fresh copy", async () => {
      const req = { query: {} } as unknown as Request;
      const res = buildResponse();

      await GET(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", NO_STORE);
    });
  });

  describe("POST", () => {
    it("should redirect to the summary page when a valid locationId is submitted", async () => {
      const req = { body: { locationId: "1" } } as unknown as Request;
      const res = buildResponse();

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/summary-of-publications?locationId=1");
    });

    it.each([
      ["no locationId is submitted", {}],
      ["an unknown locationId is submitted", { locationId: "999" }],
      ["a non-numeric locationId is submitted", { locationId: "invalid" }]
    ])("should render the error when %s", async (_, body) => {
      const req = { body } as unknown as Request;
      const res = buildResponse();

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search/index",
        expect.objectContaining({ errors: [{ text: "Please enter a court or tribunal name", href: "#location" }], locale: "en" })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should render the Welsh error message when locale is cy", async () => {
      const req = { body: {} } as unknown as Request;
      const res = buildResponse("cy");

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search/index",
        expect.objectContaining({ errors: [{ text: "Rhowch enw'r llys neu'r tribiwnlys", href: "#location" }], locale: "cy" })
      );
    });

    it.each([
      ["the error page", {}],
      ["the redirect", { locationId: "1" }]
    ])("should stop the browser caching %s so Back never shows a stale error", async (_, body) => {
      const req = { body } as unknown as Request;
      const res = buildResponse();

      await POST(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", NO_STORE);
    });
  });
});
