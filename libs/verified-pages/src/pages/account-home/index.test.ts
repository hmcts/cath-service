import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("account-home controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};

    mockResponse = {
      render: vi.fn(),
      locals: {
        locale: "en"
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render account-home page with English locale", async () => {
      const { GET } = await import("./index.js");

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-home/index",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          navigation: expect.any(Object)
        })
      );
    });

    it("should render account-home page with Welsh locale", async () => {
      mockResponse.locals = { locale: "cy" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-home/index",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          navigation: expect.any(Object)
        })
      );
    });

    it("should default to English locale when locale is not set", async () => {
      mockResponse.locals = {};

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items[0].text).toBe("Dashboard");
      expect(navigation.signOut).toBe("Sign out");
    });

    it("should use English navigation when locale is en", async () => {
      mockResponse.locals = { locale: "en" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items).toHaveLength(2);
      expect(navigation.items[0].text).toBe("Dashboard");
      expect(navigation.items[1].text).toBe("Email subscriptions");
      expect(navigation.signOut).toBe("Sign out");
    });

    it("should use Welsh navigation when locale is cy", async () => {
      mockResponse.locals = { locale: "cy" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items).toHaveLength(2);
      expect(navigation.items[0].text).toBe("Dangosfwrdd");
      expect(navigation.items[1].text).toBe("Tanysgrifiadau e-bost");
      expect(navigation.signOut).toBe("Allgofnodi");
    });

    it("should include both en and cy locale data in render", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];

      expect(renderCall.en).toBeDefined();
      expect(renderCall.cy).toBeDefined();
      expect(renderCall.en.title).toBe("Your account");
      expect(renderCall.cy.title).toBe("Eich cyfrif");
    });

    it("should include navigation with items and signOut", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items).toBeDefined();
      expect(navigation.signOut).toBeDefined();
      expect(Array.isArray(navigation.items)).toBe(true);
      expect(typeof navigation.signOut).toBe("string");
    });

    it("should set first navigation item as current", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items[0].current).toBe(true);
      expect(navigation.items[0].href).toBe("/account-home");
    });

    it("should set second navigation item as not current", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items[1].current).toBe(false);
    });

    it("should include data-test attributes on navigation items", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items[0].attributes["data-test"]).toBe("dashboard-link");
      expect(navigation.items[1].attributes["data-test"]).toBe("email-subscriptions-link");
    });

    it("should have correct hrefs for navigation items", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items[0].href).toBe("/account-home");
      expect(navigation.items[1].href).toBe("/");
    });

    it("should maintain same navigation structure for Welsh locale", async () => {
      mockResponse.locals = { locale: "cy" };

      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const navigation = renderCall.navigation;

      expect(navigation.items).toHaveLength(2);
      expect(navigation.items[0].href).toBe("/account-home");
      expect(navigation.items[1].href).toBe("/");
      expect(navigation.items[0].current).toBe(true);
      expect(navigation.items[1].current).toBe(false);
    });

    it("should have consistent navigation attributes across locales", async () => {
      // Test English
      mockResponse.locals = { locale: "en" };
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const enCall = (mockResponse.render as any).mock.calls[0][1];
      const enNav = enCall.navigation;

      vi.clearAllMocks();

      // Test Welsh
      mockResponse.locals = { locale: "cy" };
      await GET(mockRequest as Request, mockResponse as Response);

      const cyCall = (mockResponse.render as any).mock.calls[0][1];
      const cyNav = cyCall.navigation;

      // Structure should be the same, only text differs
      expect(enNav.items[0].href).toBe(cyNav.items[0].href);
      expect(enNav.items[1].href).toBe(cyNav.items[1].href);
      expect(enNav.items[0].current).toBe(cyNav.items[0].current);
      expect(enNav.items[1].current).toBe(cyNav.items[1].current);
      expect(enNav.items[0].attributes["data-test"]).toBe(cyNav.items[0].attributes["data-test"]);
      expect(enNav.items[1].attributes["data-test"]).toBe(cyNav.items[1].attributes["data-test"]);
    });

    it("should call render exactly once", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledTimes(1);
    });

    it("should render with correct template path", async () => {
      const { GET } = await import("./index.js");
      await GET(mockRequest as Request, mockResponse as Response);

      const templatePath = (mockResponse.render as any).mock.calls[0][0];
      expect(templatePath).toBe("account-home/index");
    });
  });
});
