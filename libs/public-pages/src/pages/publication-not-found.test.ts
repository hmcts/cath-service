import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./publication-not-found.js";

describe("Publication Not Found Page Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    renderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ render: renderSpy });

    mockRequest = {};
    mockResponse = {
      render: renderSpy,
      status: statusSpy
    };
  });

  describe("Response Status", () => {
    it("should return 404 status code", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
    });

    it("should call status before render", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const statusCallOrder = statusSpy.mock.invocationCallOrder[0];
      const renderCallOrder = renderSpy.mock.invocationCallOrder[0];
      expect(statusCallOrder).toBeLessThan(renderCallOrder);
    });
  });

  describe("Template Rendering", () => {
    it("should render publication-not-found template", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith("publication-not-found", expect.any(Object));
    });

    it("should pass both en and cy locale objects", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith("publication-not-found", {
        en: expect.any(Object),
        cy: expect.any(Object)
      });
    });
  });

  describe("English Locale Content", () => {
    it("should include English page title", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.en).toHaveProperty("pageTitle");
      expect(callArgs.en.pageTitle).toBe("Page not found");
    });

    it("should include English heading", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.en).toHaveProperty("heading");
      expect(callArgs.en.heading).toBe("Page not found");
    });

    it("should include English body text with expiry message", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.en).toHaveProperty("bodyText");
      expect(callArgs.en.bodyText).toContain("no longer exists");
      expect(callArgs.en.bodyText).toContain("publication");
      expect(callArgs.en.bodyText).toContain("expired");
    });

    it("should include English button text", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.en).toHaveProperty("buttonText");
      expect(callArgs.en.buttonText).toBe("Find a court or tribunal");
    });

    it("should have all required English properties", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(Object.keys(callArgs.en)).toEqual(expect.arrayContaining(["pageTitle", "heading", "bodyText", "buttonText"]));
    });
  });

  describe("Welsh Locale Content", () => {
    it("should include Welsh page title", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.cy).toHaveProperty("pageTitle");
      expect(callArgs.cy.pageTitle).toBe("Ni chanfuwyd y dudalen");
    });

    it("should include Welsh heading", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.cy).toHaveProperty("heading");
      expect(callArgs.cy.heading).toBe("Ni chanfuwyd y dudalen");
    });

    it("should include Welsh body text with expiry message", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.cy).toHaveProperty("bodyText");
      expect(callArgs.cy.bodyText).toContain("bodoli mwyach");
      expect(callArgs.cy.bodyText).toContain("cyhoeddiad");
      expect(callArgs.cy.bodyText).toContain("dod i ben");
    });

    it("should include Welsh button text", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(callArgs.cy).toHaveProperty("buttonText");
      expect(callArgs.cy.buttonText).toBe("Dod o hyd i lys neu dribiwnlys");
    });

    it("should have all required Welsh properties", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(Object.keys(callArgs.cy)).toEqual(expect.arrayContaining(["pageTitle", "heading", "bodyText", "buttonText"]));
    });

    it("should have same structure as English locale", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      const callArgs = renderSpy.mock.calls[0][1];
      expect(Object.keys(callArgs.en).sort()).toEqual(Object.keys(callArgs.cy).sort());
    });
  });

  describe("Request Independence", () => {
    it("should not read from request object", async () => {
      const requestSpy = new Proxy({} as Request, {
        get: () => {
          throw new Error("Request should not be accessed");
        }
      });

      await GET(requestSpy, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
    });

    it("should work with empty request object", async () => {
      mockRequest = {} as Request;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalled();
    });

    it("should produce same output regardless of request", async () => {
      await GET({} as Request, mockResponse as Response);
      const firstCall = renderSpy.mock.calls[0][1];

      vi.clearAllMocks();
      renderSpy = vi.fn();
      statusSpy = vi.fn().mockReturnValue({ render: renderSpy });
      mockResponse = { render: renderSpy, status: statusSpy };

      await GET({ params: { test: "value" } } as any, mockResponse as Response);
      const secondCall = renderSpy.mock.calls[0][1];

      expect(firstCall).toEqual(secondCall);
    });
  });

  describe("Error Handling", () => {
    it("should handle render function being called", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it("should call status exactly once", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledTimes(1);
    });
  });
});
