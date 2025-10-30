import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("courts-tribunals-list page", () => {
  describe("GET", () => {
    it("should render A-Z list page with grouped locations in English", async () => {
      const req = {} as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          backLink: "/search",
          groupedLocations: expect.any(Object)
        })
      );

      const call = res.render.mock.calls[0][1] as { groupedLocations: Record<string, unknown[]> };
      expect(call.groupedLocations).toHaveProperty("B");
      expect(call.groupedLocations).toHaveProperty("C");
      expect(call.groupedLocations).toHaveProperty("L");
      expect(call.groupedLocations).toHaveProperty("M");
      expect(call.groupedLocations).toHaveProperty("O");
      expect(call.groupedLocations).toHaveProperty("R");
      expect(call.groupedLocations).toHaveProperty("S");
    });

    it("should render A-Z list page with grouped locations in Welsh", async () => {
      const req = {} as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "cy" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          backLink: "/search",
          groupedLocations: expect.any(Object)
        })
      );

      const call = res.render.mock.calls[0][1] as { groupedLocations: Record<string, unknown[]> };
      expect(call.groupedLocations).toHaveProperty("C");
      expect(call.groupedLocations).toHaveProperty("G");
      expect(call.groupedLocations).toHaveProperty("L");
    });

    it("should default to English when locale is not set", async () => {
      const req = {} as Request;

      const res = {
        render: vi.fn(),
        locals: {}
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "courts-tribunals-list/index",
        expect.objectContaining({
          backLink: "/search",
          groupedLocations: expect.any(Object)
        })
      );

      const call = res.render.mock.calls[0][1] as { groupedLocations: Record<string, unknown[]> };
      expect(call.groupedLocations).toHaveProperty("B");
      expect(call.groupedLocations).toHaveProperty("O");
    });

    it("should have all locations distributed across groups", async () => {
      const req = {} as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      const call = res.render.mock.calls[0][1] as { groupedLocations: Record<string, unknown[]> };

      let totalCount = 0;
      for (const letter in call.groupedLocations) {
        totalCount += call.groupedLocations[letter].length;
      }

      expect(totalCount).toBe(10);
    });
  });
});
