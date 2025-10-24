import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

describe("manual-upload-summary page", () => {
  describe("GET", () => {
    it("should render file upload summary page with English content", async () => {
      const req = { query: {} } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          pageTitle: "File upload summary",
          subHeading: "Check upload details",
          courtName: "Court name",
          file: "File",
          listType: "List type",
          hearingStartDate: "Hearing start date",
          sensitivity: "Sensitivity",
          language: "Language",
          displayFileDates: "Display file dates",
          change: "Change",
          confirmButton: "Confirm",
          hideLanguageToggle: true
        })
      );
    });

    it("should render file upload summary page with Welsh content", async () => {
      const req = { query: { lng: "cy" } } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "cy" }
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          pageTitle: "Crynodeb lanlwytho ffeil",
          subHeading: "Gwirio manylion lanlwytho",
          courtName: "Enw'r llys",
          file: "Ffeil",
          listType: "Math o restr",
          hearingStartDate: "Dyddiad cychwyn y gwrandawiad",
          sensitivity: "Sensitifrwydd",
          language: "Iaith",
          displayFileDates: "Dangos dyddiadau ffeil",
          change: "Newid",
          confirmButton: "Cadarnhau",
          hideLanguageToggle: true
        })
      );
    });

    it("should hide language toggle", async () => {
      const req = { query: {} } as unknown as Request;

      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.hideLanguageToggle).toBe(true);
    });
  });

  describe("POST", () => {
    it("should redirect to manual-upload-confirmation", async () => {
      const req = {} as unknown as Request;

      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-confirmation");
    });
  });
});
