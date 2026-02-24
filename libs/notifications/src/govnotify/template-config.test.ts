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
    it("should return PDF_AND_SUMMARY template when PDF is under 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY = "pdf-summary-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(8, true, true)).toBe("pdf-summary-template");
    });

    it("should return SUMMARY_ONLY template when PDF is over 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = "summary-only-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(8, true, false)).toBe("summary-only-template");
    });

    it("should return SUMMARY_ONLY template when no PDF", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = "summary-only-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(8, false, false)).toBe("summary-only-template");
    });

    it("should return PDF_AND_SUMMARY template for any list type with PDF under 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY = "pdf-summary-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(1, true, true)).toBe("pdf-summary-template");
    });

    it("should fall back to base template when PDF_AND_SUMMARY template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY = "";
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "base-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(1, true, true)).toBe("base-template");
    });

    it("should fall back to base template when SUMMARY_ONLY template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY = "";
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "base-template";

      const { getSubscriptionTemplateIdForListType } = await import("./template-config.js");
      expect(getSubscriptionTemplateIdForListType(1, false, false)).toBe("base-template");
    });
  });

  describe("getApiKey", () => {
    it("should return API key when environment variable is set", async () => {
      process.env.GOVUK_NOTIFY_TEST_API_KEY = "test-api-key";

      const { getApiKey } = await import("./template-config.js");
      expect(getApiKey()).toBe("test-api-key");
    });

    it("should throw error when environment variable is not set", async () => {
      process.env.GOVUK_NOTIFY_TEST_API_KEY = "";

      const { getApiKey } = await import("./template-config.js");
      expect(() => getApiKey()).toThrow("GOVUK_NOTIFY_TEST_API_KEY environment variable is not set");
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
      const date = new Date("2024-12-01T10:00:00Z");
      expect(formatPublicationDate(date)).toBe("1 December 2024");
    });

    it("should handle single digit days", async () => {
      const { formatPublicationDate } = await import("./template-config.js");
      const date = new Date("2024-01-05T10:00:00Z");
      expect(formatPublicationDate(date)).toBe("5 January 2024");
    });

    it("should handle all months correctly", async () => {
      const { formatPublicationDate } = await import("./template-config.js");
      const dates = [
        { date: new Date("2024-01-15"), expected: "15 January 2024" },
        { date: new Date("2024-02-15"), expected: "15 February 2024" },
        { date: new Date("2024-03-15"), expected: "15 March 2024" },
        { date: new Date("2024-04-15"), expected: "15 April 2024" },
        { date: new Date("2024-05-15"), expected: "15 May 2024" },
        { date: new Date("2024-06-15"), expected: "15 June 2024" },
        { date: new Date("2024-07-15"), expected: "15 July 2024" },
        { date: new Date("2024-08-15"), expected: "15 August 2024" },
        { date: new Date("2024-09-15"), expected: "15 September 2024" },
        { date: new Date("2024-10-15"), expected: "15 October 2024" },
        { date: new Date("2024-11-15"), expected: "15 November 2024" },
        { date: new Date("2024-12-15"), expected: "15 December 2024" }
      ];

      for (const { date, expected } of dates) {
        expect(formatPublicationDate(date)).toBe(expected);
      }
    });
  });

  describe("buildTemplateParameters", () => {
    it("should build template parameters with location subscription", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        hasLocationSubscription: true
      });

      expect(result.ListType).toBe("Daily Cause List");
      expect(result.content_date).toBe("1 December 2024");
      expect(result.locations).toBe("Birmingham Crown Court");
      expect(result.display_locations).toBe("yes");
      expect(result.case).toBe("");
      expect(result.display_case).toBe("");
      expect(result.start_page_link).toBe("https://test-service.gov.uk");
      expect(result.subscription_page_link).toBe("https://test-service.gov.uk");
    });

    it("should build template parameters without location subscription", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        hasLocationSubscription: false
      });

      expect(result.locations).toBe("");
      expect(result.display_locations).toBe("");
    });

    it("should build template parameters with case information", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        caseInfo: "CASE-123, CASE-456",
        hasLocationSubscription: false
      });

      expect(result.case).toBe("CASE-123, CASE-456");
      expect(result.display_case).toBe("yes");
    });

    it("should build template parameters with both location and case information", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        caseInfo: "CASE-123",
        hasLocationSubscription: true
      });

      expect(result.locations).toBe("Birmingham Crown Court");
      expect(result.case).toBe("CASE-123");
      expect(result.display_locations).toBe("yes");
      expect(result.display_case).toBe("yes");
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

      expect(result.locations).toBe("");
      expect(result.ListType).toBe("Civil And Family Daily Cause List");
      expect(result.content_date).toBe("10 February 2025");
      expect(result.start_page_link).toBe("https://test-service.gov.uk");
      expect(result.subscription_page_link).toBe("https://test-service.gov.uk");
      expect(result.display_summary).toBe("yes");
      expect(result.summary_of_cases).toBe("Case 123 - Smith v Jones");
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
