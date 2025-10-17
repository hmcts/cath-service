import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./search.js";

describe("search page", () => {
  describe("GET", () => {
    it("should render search page without preselected location", async () => {
      const req = {
        query: {}
      } as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          backLink: "/view-option",
          preselectedLocation: undefined,
          locale: "en"
        })
      );
    });

    it("should render search page with preselected location when locationId query param is provided", async () => {
      const req = {
        query: { locationId: "1" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          backLink: "/view-option",
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
      const req = {
        query: { locationId: "999" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          preselectedLocation: undefined,
          locale: "en"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to summary page when valid locationId is submitted", async () => {
      const req = {
        body: { locationId: "1" }
      } as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/summary-of-publications?locationId=1");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should show error when no locationId is submitted", async () => {
      const req = {
        body: {}
      } as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          errors: [
            {
              text: "Select a court or tribunal from the list",
              href: "#location"
            }
          ],
          backLink: "/view-option",
          locale: "en"
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should show error when invalid locationId is submitted", async () => {
      const req = {
        body: { locationId: "999" }
      } as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: "Select a court or tribunal from the list",
              href: "#location"
            })
          ])
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should show error when non-numeric locationId is submitted", async () => {
      const req = {
        body: { locationId: "invalid" }
      } as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: "Select a court or tribunal from the list"
            })
          ])
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should show Welsh error message when locale is cy", async () => {
      const req = {
        body: {}
      } as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn(),
        locals: { locale: "cy" }
      } as unknown as Response;

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "search",
        expect.objectContaining({
          errors: [
            {
              text: "Dewiswch lys neu dribiwnlys o'r rhestr",
              href: "#location"
            }
          ]
        })
      );
    });
  });
});
