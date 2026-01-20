import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./[listTypeId].js";

// Mock dependencies
vi.mock("@hmcts/list-search-config", () => ({
  getConfigForListType: vi.fn(),
  saveConfig: vi.fn()
}));

import * as service from "@hmcts/list-search-config";

describe("list-search-config page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      body: {},
      params: { listTypeId: "5" }
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render list-search-config page in English", async () => {
      (service.getConfigForListType as any).mockResolvedValue(null);

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "list-search-config/index",
        expect.objectContaining({
          pageTitle: "Configure list type search fields",
          heading: "Configure list type search fields",
          data: {
            caseNumberFieldName: "",
            caseNameFieldName: ""
          }
        })
      );
    });

    it("should render list-search-config page in Welsh", async () => {
      req.query = { lng: "cy" };
      (service.getConfigForListType as any).mockResolvedValue(null);

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "list-search-config/index",
        expect.objectContaining({
          pageTitle: "Ffurfweddu meysydd chwilio math rhestr",
          heading: "Ffurfweddu meysydd chwilio math rhestr"
        })
      );
    });

    it("should load existing configuration", async () => {
      (service.getConfigForListType as any).mockResolvedValue({
        caseNumberFieldName: "caseRef",
        caseNameFieldName: "caseName"
      });

      await getHandler(req as Request, res as Response);

      expect(service.getConfigForListType).toHaveBeenCalledWith(5);
      expect(res.render).toHaveBeenCalledWith(
        "list-search-config/index",
        expect.objectContaining({
          data: {
            caseNumberFieldName: "caseRef",
            caseNameFieldName: "caseName"
          }
        })
      );
    });

    it("should return 400 for invalid list type ID", async () => {
      req.params = { listTypeId: "abc" };

      await getHandler(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Invalid list type ID");
    });
  });

  describe("POST", () => {
    it("should save configuration and redirect to success page", async () => {
      req.body = {
        caseNumberFieldName: "caseRef",
        caseNameFieldName: "caseName"
      };
      (service.saveConfig as any).mockResolvedValue({ success: true });

      await postHandler(req as Request, res as Response);

      expect(service.saveConfig).toHaveBeenCalledWith(5, "caseRef", "caseName");
      expect(res.redirect).toHaveBeenCalledWith("/list-search-config-success");
    });

    it("should redirect with Welsh locale", async () => {
      req.query = { lng: "cy" };
      req.body = {
        caseNumberFieldName: "caseRef",
        caseNameFieldName: "caseName"
      };
      (service.saveConfig as any).mockResolvedValue({ success: true });

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/list-search-config-success?lng=cy");
    });

    it("should allow saving with blank fields", async () => {
      req.body = {
        caseNumberFieldName: "",
        caseNameFieldName: ""
      };
      (service.saveConfig as any).mockResolvedValue({ success: true });

      await postHandler(req as Request, res as Response);

      expect(service.saveConfig).toHaveBeenCalledWith(5, "", "");
      expect(res.redirect).toHaveBeenCalledWith("/list-search-config-success");
    });

    it("should show validation errors when fields have invalid characters", async () => {
      req.body = {
        caseNumberFieldName: "case-number",
        caseNameFieldName: "case@name"
      };
      (service.saveConfig as any).mockResolvedValue({
        success: false,
        errors: [
          { field: "Case number field name", message: "Case number field name must contain only letters, numbers and underscores" },
          { field: "Case name field name", message: "Case name field name must contain only letters, numbers and underscores" }
        ]
      });

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "list-search-config/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ text: "Case number field name must contain only letters, numbers and underscores" }),
            expect.objectContaining({ text: "Case name field name must contain only letters, numbers and underscores" })
          ]),
          fieldErrors: expect.objectContaining({
            caseNumberFieldName: { text: "Case number field name must contain only letters, numbers and underscores" },
            caseNameFieldName: { text: "Case name field name must contain only letters, numbers and underscores" }
          })
        })
      );
    });

    it("should return 400 for invalid list type ID", async () => {
      req.params = { listTypeId: "invalid" };

      await postHandler(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Invalid list type ID");
    });
  });
});
