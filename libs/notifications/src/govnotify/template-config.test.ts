import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("template-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getTemplateId", () => {
    it("should return template ID when environment variable is set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "test-template-id";

      const { getTemplateId } = await import("./template-config.js");
      expect(getTemplateId()).toBe("test-template-id");
    });

    it("should throw error when environment variable is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "";

      const { getTemplateId } = await import("./template-config.js");
      expect(() => getTemplateId()).toThrow("GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION environment variable is not set");
    });
  });

  describe("getSubscriptionTemplateIdForListType", () => {
    it("should return PDF_AND_SUMMARY template for Civil/Family list with PDF under 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY = "pdf-summary-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(8, true, true)).toBe("pdf-summary-template");
    });

    it("should return SUMMARY_ONLY template for Civil/Family list with PDF over 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = "summary-only-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(8, true, false)).toBe("summary-only-template");
    });

    it("should return SUMMARY_ONLY template for Civil/Family list without PDF", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = "summary-only-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(8, false, false)).toBe("summary-only-template");
    });

    it("should return default template for non-Civil/Family list types", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "default-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(1, true, true)).toBe("default-template");
    });

    it("should throw error when PDF_AND_SUMMARY template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY = "";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(() => getSubscriptionTemplateIdForListType(8, true, true)).toThrow(
        "GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY environment variable is not set"
      );
    });

    it("should throw error when SUMMARY_ONLY template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = "";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(() => getSubscriptionTemplateIdForListType(8, false, false)).toThrow(
        "GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY environment variable is not set"
      );
    });
  });

  describe("getApiKey", () => {
    it("should return API key when environment variable is set", async () => {
      process.env.GOVUK_NOTIFY_API_KEY = "test-api-key";

      const { getApiKey } = await import("./template-config.js");
      expect(getApiKey()).toBe("test-api-key");
    });

    it("should throw error when environment variable is not set", async () => {
      process.env.GOVUK_NOTIFY_API_KEY = "";

      const { getApiKey } = await import("./template-config.js");
      expect(() => getApiKey()).toThrow("GOVUK_NOTIFY_API_KEY environment variable is not set");
    });
  });

  describe("getServiceUrl", () => {
    it("should return service URL when environment variable is set", async () => {
      process.env.CATH_SERVICE_URL = "https://custom-service.gov.uk";

      const { getServiceUrl } = await import("./template-config.js");
      expect(getServiceUrl()).toBe("https://custom-service.gov.uk");
    });

    it("should return default URL when environment variable is not set", async () => {
      delete process.env.CATH_SERVICE_URL;

      const { getServiceUrl } = await import("./template-config.js");
      expect(getServiceUrl()).toBe("https://www.court-tribunal-hearings.service.gov.uk");
    });
  });

  describe("formatPublicationDate", () => {
    it("should format date correctly", async () => {
      const { formatPublicationDate } = await import("./template-config.js");
      const date = new Date("2025-01-15");
      expect(formatPublicationDate(date)).toBe("15 January 2025");
    });

    it("should handle single digit days", async () => {
      const { formatPublicationDate } = await import("./template-config.js");
      const date = new Date("2025-03-05");
      expect(formatPublicationDate(date)).toBe("5 March 2025");
    });

    it("should handle all months correctly", async () => {
      const { formatPublicationDate } = await import("./template-config.js");
      const months = [
        { date: new Date("2025-01-01"), expected: "1 January 2025" },
        { date: new Date("2025-06-15"), expected: "15 June 2025" },
        { date: new Date("2025-12-25"), expected: "25 December 2025" }
      ];

      for (const { date, expected } of months) {
        expect(formatPublicationDate(date)).toBe(expected);
      }
    });
  });

  describe("buildTemplateParameters", () => {
    it("should build template parameters correctly", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Civil And Family Daily Cause List",
        publicationDate: new Date("2025-01-20"),
        locationName: "Oxford Court"
      });

      expect(result).toEqual({
        locations: "Oxford Court",
        ListType: "Civil And Family Daily Cause List",
        content_date: "20 January 2025",
        start_page_link: "https://test-service.gov.uk",
        subscription_page_link: "https://test-service.gov.uk"
      });
    });
  });

  describe("buildEnhancedTemplateParameters", () => {
    it("should build enhanced template parameters with case summary", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildEnhancedTemplateParameters } = await import("./template-config.js");
      const result = buildEnhancedTemplateParameters({
        userName: "Jane Smith",
        hearingListName: "Civil And Family Daily Cause List",
        publicationDate: new Date("2025-02-10"),
        locationName: "Birmingham Court",
        caseSummary: "Case 123 - Smith v Jones"
      });

      expect(result).toEqual({
        locations: "Birmingham Court",
        ListType: "Civil And Family Daily Cause List",
        content_date: "10 February 2025",
        start_page_link: "https://test-service.gov.uk",
        subscription_page_link: "https://test-service.gov.uk",
        display_summary: "yes",
        summary_of_cases: "Case 123 - Smith v Jones"
      });
    });

    it("should include all base parameters plus enhanced fields", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildEnhancedTemplateParameters } = await import("./template-config.js");
      const result = buildEnhancedTemplateParameters({
        userName: "Test User",
        hearingListName: "Test List",
        publicationDate: new Date("2025-03-15"),
        locationName: "Test Location",
        caseSummary: "Summary content"
      });

      expect(result).toHaveProperty("display_summary", "yes");
      expect(result).toHaveProperty("summary_of_cases", "Summary content");
      expect(result).toHaveProperty("locations");
      expect(result).toHaveProperty("ListType");
      expect(result).toHaveProperty("content_date");
    });
  });
});
