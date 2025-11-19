import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "../reference-data-upload/repository/sub-jurisdiction-repository.js";
import * as validation from "../reference-data-upload/validation/sub-jurisdiction-validation.js";

// Mock the modules
vi.mock("../reference-data-upload/repository/sub-jurisdiction-repository.js", () => ({
  createSubJurisdiction: vi.fn(),
  getAllJurisdictions: vi.fn()
}));

vi.mock("../reference-data-upload/validation/sub-jurisdiction-validation.js", () => ({
  validateSubJurisdictionData: vi.fn()
}));

// Import after mocking
const { GET, POST } = await import("./index.js");

describe("add-sub-jurisdiction page", () => {
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

    // Default mock for getAllJurisdictions
    vi.mocked(repository.getAllJurisdictions).mockResolvedValue([
      { jurisdictionId: 1, displayName: "Civil" },
      { jurisdictionId: 2, displayName: "Family" }
    ]);
  });

  describe("GET", () => {
    it("should render the add-sub-jurisdiction page with English content", async () => {
      mockRequest.query = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(repository.getAllJurisdictions).toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-sub-jurisdiction/index",
        expect.objectContaining({
          pageTitle: "Add Sub Jurisdiction",
          jurisdictionItems: expect.arrayContaining([
            { value: "", text: "Select a jurisdiction" },
            { value: "1", text: "Civil" },
            { value: "2", text: "Family" }
          ]),
          data: {
            jurisdictionId: "",
            name: "",
            welshName: ""
          },
          errors: undefined
        })
      );
    });

    it("should render the page with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-sub-jurisdiction/index",
        expect.objectContaining({
          pageTitle: "Ychwanegu Is-awdurdodaeth"
        })
      );
    });
  });

  describe("POST", () => {
    it("should create sub-jurisdiction and redirect to success page on valid data", async () => {
      mockRequest.body = {
        jurisdictionId: "1",
        name: "Civil Court",
        welshName: "Llys Sifil"
      };
      mockRequest.session = {} as any;

      vi.mocked(validation.validateSubJurisdictionData).mockResolvedValue([]);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(repository.createSubJurisdiction).toHaveBeenCalledWith(1, "Civil Court", "Llys Sifil");
      expect(mockRequest.session.subJurisdictionSuccess).toBe(true);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-sub-jurisdiction-success");
    });

    it("should redirect to Welsh success page when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.body = {
        jurisdictionId: "1",
        name: "Civil Court",
        welshName: "Llys Sifil"
      };

      vi.mocked(validation.validateSubJurisdictionData).mockResolvedValue([]);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-sub-jurisdiction-success?lng=cy");
    });

    it("should render form with errors on validation failure", async () => {
      mockRequest.body = {
        jurisdictionId: "",
        name: "",
        welshName: ""
      };

      const errors = [
        { text: "Select a jurisdiction", href: "#jurisdictionId" },
        { text: "Enter Sub Jurisdiction Name in English", href: "#name" },
        { text: "Enter Sub Jurisdiction Name in Welsh", href: "#welshName" }
      ];

      vi.mocked(validation.validateSubJurisdictionData).mockResolvedValue(errors);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(repository.getAllJurisdictions).toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-sub-jurisdiction/index",
        expect.objectContaining({
          data: { jurisdictionId: "", name: "", welshName: "" },
          errors
        })
      );
      expect(repository.createSubJurisdiction).not.toHaveBeenCalled();
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it("should preserve form data on validation failure", async () => {
      mockRequest.body = {
        jurisdictionId: "1",
        name: "Civil Court",
        welshName: ""
      };

      const errors = [{ text: "Enter Sub Jurisdiction Name in Welsh", href: "#welshName" }];

      vi.mocked(validation.validateSubJurisdictionData).mockResolvedValue(errors);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-sub-jurisdiction/index",
        expect.objectContaining({
          data: { jurisdictionId: "1", name: "Civil Court", welshName: "" },
          errors
        })
      );
    });

    it("should reload jurisdiction dropdown on validation failure", async () => {
      mockRequest.body = {
        jurisdictionId: "",
        name: "Civil Court",
        welshName: "Llys Sifil"
      };

      const errors = [{ text: "Select a jurisdiction", href: "#jurisdictionId" }];
      vi.mocked(validation.validateSubJurisdictionData).mockResolvedValue(errors);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(repository.getAllJurisdictions).toHaveBeenCalledTimes(1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-sub-jurisdiction/index",
        expect.objectContaining({
          jurisdictionItems: expect.arrayContaining([{ value: "", text: "Select a jurisdiction" }])
        })
      );
    });
  });
});
