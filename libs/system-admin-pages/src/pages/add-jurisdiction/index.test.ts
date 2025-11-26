import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "../../reference-data-upload/repository/jurisdiction-repository.js";
import * as validation from "../../reference-data-upload/validation/jurisdiction-validation.js";

// Mock the modules
vi.mock("../../reference-data-upload/repository/jurisdiction-repository.js", () => ({
  createJurisdiction: vi.fn()
}));

vi.mock("../../reference-data-upload/validation/jurisdiction-validation.js", () => ({
  validateJurisdictionData: vi.fn()
}));

// Import after mocking
const { getHandler: GET, postHandler: POST } = await import("./index.js");

describe("add-jurisdiction page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {},
      body: {},
      session: {} as any
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render the add-jurisdiction page with English content", async () => {
      mockRequest.query = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-jurisdiction/index",
        expect.objectContaining({
          pageTitle: "Add Jurisdiction",
          data: {
            name: "",
            welshName: ""
          },
          errors: undefined
        })
      );
    });

    it("should render the add-jurisdiction page with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-jurisdiction/index",
        expect.objectContaining({
          pageTitle: "Ychwanegu Awdurdodaeth"
        })
      );
    });
  });

  describe("POST", () => {
    it("should create jurisdiction and redirect to success page on valid data", async () => {
      mockRequest.body = {
        name: "Civil",
        welshName: "Sifil"
      };
      mockRequest.session = {
        save: vi.fn((cb) => cb())
      } as any;

      vi.mocked(validation.validateJurisdictionData).mockResolvedValue([]);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(repository.createJurisdiction).toHaveBeenCalledWith("Civil", "Sifil");
      expect(mockRequest.session.jurisdictionSuccess).toEqual({
        name: "Civil",
        welshName: "Sifil"
      });
      expect(mockRequest.session.save).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-jurisdiction-success");
    });

    it("should redirect to Welsh success page when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.body = {
        name: "Civil",
        welshName: "Sifil"
      };
      mockRequest.session = {
        save: vi.fn((cb) => cb())
      } as any;

      vi.mocked(validation.validateJurisdictionData).mockResolvedValue([]);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockRequest.session.save).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-jurisdiction-success?lng=cy");
    });

    it("should render form with errors on validation failure", async () => {
      mockRequest.body = {
        name: "",
        welshName: ""
      };

      const errors = [
        { text: "Enter jurisdiction name in English", href: "#name" },
        { text: "Enter jurisdiction name in Welsh", href: "#welshName" }
      ];

      vi.mocked(validation.validateJurisdictionData).mockResolvedValue(errors);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-jurisdiction/index",
        expect.objectContaining({
          data: { name: "", welshName: "" },
          errors
        })
      );
      expect(repository.createJurisdiction).not.toHaveBeenCalled();
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it("should preserve form data on validation failure", async () => {
      mockRequest.body = {
        name: "Civil",
        welshName: ""
      };

      const errors = [{ text: "Enter jurisdiction name in Welsh", href: "#welshName" }];

      vi.mocked(validation.validateJurisdictionData).mockResolvedValue(errors);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-jurisdiction/index",
        expect.objectContaining({
          data: { name: "Civil", welshName: "" },
          errors
        })
      );
    });
  });
});
