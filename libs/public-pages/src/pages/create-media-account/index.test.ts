import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MulterRequest } from "../../media-application/repository/model.js";
import { GET, POST } from "./index.js";

vi.mock("../../media-application/repository/query.js", () => ({
  createMediaApplication: vi.fn(),
  updateProofOfIdPath: vi.fn()
}));

vi.mock("../../media-application/storage.js", () => ({
  saveIdProofFile: vi.fn()
}));

vi.mock("../validation.js", () => ({
  validateForm: vi.fn()
}));

const { createMediaApplication, updateProofOfIdPath } = await import("../../media-application/repository/query.js");
const { saveIdProofFile } = await import("../../media-application/storage.js");
const { validateForm } = await import("../validation.js");

describe("create-media-account controller", () => {
  let mockRequest: Partial<MulterRequest>;
  let mockResponse: Partial<Response>;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSession = {
      save: vi.fn((callback: any) => callback(null)),
      mediaApplicationSubmitted: false,
      mediaApplicationForm: {},
      mediaApplicationErrors: []
    };

    mockRequest = {
      query: {},
      body: {},
      session: mockSession
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("GET", () => {
    it("should render the form with English content by default", async () => {
      await GET(mockRequest as any, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "create-media-account/index",
        expect.objectContaining({
          locale: "en",
          title: expect.any(String),
          data: {}
        })
      );
    });

    it("should render the form with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as any, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "create-media-account/index",
        expect.objectContaining({
          locale: "cy",
          title: expect.any(String)
        })
      );
    });

    it("should display errors from session", async () => {
      const mockErrors = [{ text: "Enter your full name", href: "#fullName" }];
      mockSession.mediaApplicationErrors = mockErrors;

      await GET(mockRequest as any, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "create-media-account/index",
        expect.objectContaining({
          errors: mockErrors
        })
      );
    });

    it("should display form data from session when wasSubmitted is true", async () => {
      const mockFormData = {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: true
      };
      mockSession.mediaApplicationSubmitted = true;
      mockSession.mediaApplicationForm = mockFormData;

      await GET(mockRequest as any, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "create-media-account/index",
        expect.objectContaining({
          data: mockFormData
        })
      );
    });

    it("should clear form data when wasSubmitted is false", async () => {
      mockSession.mediaApplicationForm = { name: "Test" };
      mockSession.mediaApplicationSubmitted = false;

      await GET(mockRequest as any, mockResponse as Response);

      expect(mockSession.mediaApplicationForm).toBeUndefined();
    });

    it("should clear errors from session after rendering", async () => {
      mockSession.mediaApplicationErrors = [{ text: "Error", href: "#field" }];

      await GET(mockRequest as any, mockResponse as Response);

      expect(mockSession.mediaApplicationErrors).toBeUndefined();
    });

    it("should clear wasSubmitted flag after rendering", async () => {
      mockSession.mediaApplicationSubmitted = true;

      await GET(mockRequest as any, mockResponse as Response);

      expect(mockSession.mediaApplicationSubmitted).toBeUndefined();
    });
  });

  describe("POST", () => {
    let mockFile: Express.Multer.File;

    beforeEach(() => {
      mockFile = {
        fieldname: "idProof",
        originalname: "passport.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024 * 1024,
        buffer: Buffer.from("test"),
        stream: null as any,
        destination: "",
        filename: "",
        path: ""
      };

      mockRequest.body = {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: "on"
      };
      mockRequest.file = mockFile;
    });

    it("should redirect to form with errors when validation fails", async () => {
      const mockErrors = [{ text: "Enter your full name", href: "#fullName" }];
      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockSession.mediaApplicationErrors).toEqual(mockErrors);
      expect(mockSession.mediaApplicationForm).toEqual({
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: true
      });
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/create-media-account?lng=en");
    });

    it("should preserve locale in redirect when validation fails", async () => {
      mockRequest.query = { lng: "cy" };
      const mockErrors = [{ text: "Nodwch eich enw llawn", href: "#fullName" }];
      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/create-media-account?lng=cy");
    });

    it("should create media application and save file on success", async () => {
      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(createMediaApplication).mockResolvedValue("test-uuid-123");
      vi.mocked(saveIdProofFile).mockResolvedValue("/path/to/storage/test-uuid-123.jpg");

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(createMediaApplication).toHaveBeenCalledWith({
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC News"
      });
      expect(saveIdProofFile).toHaveBeenCalledWith("test-uuid-123", "passport.jpg", mockFile.buffer);
      expect(updateProofOfIdPath).toHaveBeenCalledWith("test-uuid-123", "/path/to/storage/test-uuid-123.jpg");
    });

    it("should redirect to confirmation page on success", async () => {
      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(createMediaApplication).mockResolvedValue("test-uuid-123");
      vi.mocked(saveIdProofFile).mockResolvedValue("/path/to/storage/test-uuid-123.jpg");

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockSession.mediaApplicationSubmitted).toBe(true);
      expect(mockSession.mediaApplicationForm).toBeUndefined();
      expect(mockSession.mediaApplicationErrors).toBeUndefined();
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/account-request-submitted?lng=en");
    });

    it("should preserve locale in success redirect", async () => {
      mockRequest.query = { lng: "cy" };
      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(createMediaApplication).mockResolvedValue("test-uuid-123");
      vi.mocked(saveIdProofFile).mockResolvedValue("/path/to/storage/test-uuid-123.jpg");

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/account-request-submitted?lng=cy");
    });

    it("should handle database error gracefully", async () => {
      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(createMediaApplication).mockRejectedValue(new Error("Database error"));

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/500", { locale: "en" });
    });

    it("should trim whitespace from form fields", async () => {
      mockRequest.body = {
        fullName: "  John Smith  ",
        email: "  john@example.com  ",
        employer: "  BBC News  ",
        termsAccepted: "on"
      };
      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(createMediaApplication).mockResolvedValue("test-uuid-123");
      vi.mocked(saveIdProofFile).mockResolvedValue("/path/to/storage/test-uuid-123.jpg");

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(createMediaApplication).toHaveBeenCalledWith({
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC News"
      });
    });

    it("should handle missing file when validation passes", async () => {
      mockRequest.file = undefined;
      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(createMediaApplication).mockResolvedValue("test-uuid-123");
      vi.mocked(saveIdProofFile).mockResolvedValue("/path/to/storage/test-uuid-123.jpg");

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(saveIdProofFile).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/account-request-submitted?lng=en");
    });

    it("should convert termsAccepted checkbox value to boolean", async () => {
      const mockErrors = [{ text: "Error", href: "#field" }];
      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockSession.mediaApplicationForm.termsAccepted).toBe(true);
    });

    it("should handle unchecked termsAccepted checkbox", async () => {
      mockRequest.body.termsAccepted = undefined;
      const mockErrors = [{ text: "Select the checkbox", href: "#termsAccepted" }];
      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(mockRequest as MulterRequest, mockResponse as Response);

      expect(mockSession.mediaApplicationForm.termsAccepted).toBe(false);
    });
  });
});
