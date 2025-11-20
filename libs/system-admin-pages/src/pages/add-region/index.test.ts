import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "../../reference-data-upload/repository/region-repository.js";
import * as validation from "../../reference-data-upload/validation/region-validation.js";

// Mock the modules
vi.mock("../../reference-data-upload/repository/region-repository.js", () => ({
  createRegion: vi.fn()
}));

vi.mock("../../reference-data-upload/validation/region-validation.js", () => ({
  validateRegionData: vi.fn()
}));

// Import after mocking
const { getHandler: GET, postHandler: POST } = await import("./index.js");

describe("add-region page", () => {
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
    it("should render the add-region page with English content", async () => {
      mockRequest.query = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-region/index",
        expect.objectContaining({
          pageTitle: "Add Region",
          data: {
            name: "",
            welshName: ""
          },
          errors: undefined
        })
      );
    });

    it("should render the add-region page with Welsh content", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-region/index",
        expect.objectContaining({
          pageTitle: "Ychwanegu Rhanbarth",
          data: {
            name: "",
            welshName: ""
          },
          errors: undefined
        })
      );
    });
  });

  describe("POST", () => {
    it("should render errors when validation fails", async () => {
      mockRequest.body = { name: "", welshName: "" };
      vi.mocked(validation.validateRegionData).mockResolvedValueOnce([{ text: "Enter region name in English", href: "#name" }]);

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-region/index",
        expect.objectContaining({
          errors: [{ text: "Enter region name in English", href: "#name" }]
        })
      );
    });

    it("should create region and redirect to success page on valid data", async () => {
      mockRequest.body = { name: "London", welshName: "Llundain" };
      vi.mocked(validation.validateRegionData).mockResolvedValueOnce([]);
      vi.mocked(repository.createRegion).mockResolvedValueOnce();

      await POST(mockRequest as Request, mockResponse as Response);

      expect(repository.createRegion).toHaveBeenCalledWith("London", "Llundain");
      expect(mockRequest.session).toHaveProperty("regionSuccess", {
        name: "London",
        welshName: "Llundain"
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-region-success");
    });

    it("should preserve Welsh language in redirect", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.body = { name: "London", welshName: "Llundain" };
      vi.mocked(validation.validateRegionData).mockResolvedValueOnce([]);
      vi.mocked(repository.createRegion).mockResolvedValueOnce();

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-region-success?lng=cy");
    });

    it("should handle database errors gracefully", async () => {
      mockRequest.body = { name: "London", welshName: "Llundain" };
      vi.mocked(validation.validateRegionData).mockResolvedValueOnce([]);
      vi.mocked(repository.createRegion).mockRejectedValueOnce(new Error("Database error"));

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-region/index",
        expect.objectContaining({
          errors: [{ text: "Failed to create region. Please try again.", href: "#name" }]
        })
      );
    });

    it("should trim whitespace from form data", async () => {
      mockRequest.body = { name: "  London  ", welshName: "  Llundain  " };
      vi.mocked(validation.validateRegionData).mockResolvedValueOnce([]);
      vi.mocked(repository.createRegion).mockResolvedValueOnce();

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockRequest.session).toHaveProperty("regionSuccess", {
        name: "London",
        welshName: "Llundain"
      });
    });
  });
});
