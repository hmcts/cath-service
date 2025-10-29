import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("admin dashboard page", () => {
  describe("GET", () => {
    it("should render dashboard page with English content", async () => {
      const req = { query: {} } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "admin-dashboard/index",
        expect.objectContaining({
          pageTitle: "Admin Dashboard",
          tiles: expect.arrayContaining([
            expect.objectContaining({
              heading: "Upload",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Upload Excel file",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Remove",
              description: expect.any(String)
            })
          ]),
          navigation: {
            signOut: "Sign out"
          },
          hideLanguageToggle: true
        })
      );
    });

    it("should render dashboard page with Welsh content", async () => {
      const req = { query: { lng: "cy" } } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "cy" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "admin-dashboard/index",
        expect.objectContaining({
          pageTitle: "Admin Dashboard",
          tiles: expect.arrayContaining([
            expect.objectContaining({
              heading: "Upload",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Upload Excel file",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Remove",
              description: expect.any(String)
            })
          ]),
          navigation: {
            signOut: "Allgofnodi"
          },
          hideLanguageToggle: true
        })
      );
    });

    it("should include three tiles", async () => {
      const req = { query: {} } as unknown as Request;

      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.tiles).toHaveLength(3);
    });

    it("should set navigation.signOut with language-specific text", async () => {
      const req = { query: { lng: "en" } } as unknown as Request;

      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.navigation).toEqual({
        signOut: "Sign out"
      });
    });
  });
});
