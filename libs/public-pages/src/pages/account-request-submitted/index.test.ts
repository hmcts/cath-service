import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

describe("account-request-submitted", () => {
  describe("GET handler", () => {
    it("should render account-request-submitted template with English and Welsh translations", async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        render: vi.fn()
      } as unknown as Response;

      await GET(mockRequest, mockResponse);

      expect(mockResponse.render).toHaveBeenCalledWith("account-request-submitted/index", {
        en,
        cy
      });
    });

    it("should pass English translation object to template", async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        render: vi.fn()
      } as unknown as Response;

      await GET(mockRequest, mockResponse);

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      expect(renderCall[1]).toHaveProperty("en");
      expect(renderCall[1].en).toBe(en);
    });

    it("should pass Welsh translation object to template", async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        render: vi.fn()
      } as unknown as Response;

      await GET(mockRequest, mockResponse);

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      expect(renderCall[1]).toHaveProperty("cy");
      expect(renderCall[1].cy).toBe(cy);
    });

    it("should render correct template path", async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        render: vi.fn()
      } as unknown as Response;

      await GET(mockRequest, mockResponse);

      expect(mockResponse.render).toHaveBeenCalledWith(expect.stringContaining("account-request-submitted"), expect.any(Object));
    });
  });

  describe("translation imports", () => {
    it("should import English translations", () => {
      expect(en).toBeDefined();
      expect(en).toHaveProperty("bannerTitle");
      expect(en).toHaveProperty("whatHappensNextTitle");
      expect(en).toHaveProperty("paragraph1");
      expect(en).toHaveProperty("paragraph2");
      expect(en).toHaveProperty("paragraph3");
    });

    it("should import Welsh translations", () => {
      expect(cy).toBeDefined();
      expect(cy).toHaveProperty("bannerTitle");
      expect(cy).toHaveProperty("whatHappensNextTitle");
      expect(cy).toHaveProperty("paragraph1");
      expect(cy).toHaveProperty("paragraph2");
      expect(cy).toHaveProperty("paragraph3");
    });

    it("should have matching keys between English and Welsh translations", () => {
      const enKeys = Object.keys(en).sort();
      const cyKeys = Object.keys(cy).sort();

      expect(enKeys).toEqual(cyKeys);
    });

    it("should have non-empty translation values", () => {
      Object.values(en).forEach((value) => {
        expect(value).toBeTruthy();
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });

      Object.values(cy).forEach((value) => {
        expect(value).toBeTruthy();
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });
});
