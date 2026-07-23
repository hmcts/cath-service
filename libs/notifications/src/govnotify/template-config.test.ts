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

  describe("isSjpListType", () => {
    it("should return true for SJP_PUBLIC_LIST", async () => {
      const { isSjpListType } = await import("./template-config.js");
      expect(isSjpListType("SJP_PUBLIC_LIST")).toBe(true);
    });

    it("should return true for SJP_DELTA_PUBLIC_LIST", async () => {
      const { isSjpListType } = await import("./template-config.js");
      expect(isSjpListType("SJP_DELTA_PUBLIC_LIST")).toBe(true);
    });

    it("should return true for SJP_PRESS_LIST", async () => {
      const { isSjpListType } = await import("./template-config.js");
      expect(isSjpListType("SJP_PRESS_LIST")).toBe(true);
    });

    it("should return true for SJP_DELTA_PRESS_LIST", async () => {
      const { isSjpListType } = await import("./template-config.js");
      expect(isSjpListType("SJP_DELTA_PRESS_LIST")).toBe(true);
    });

    it("should return false for non-SJP list types", async () => {
      const { isSjpListType } = await import("./template-config.js");
      expect(isSjpListType("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST")).toBe(false);
      expect(isSjpListType("CROWN_DAILY_LIST")).toBe(false);
    });
  });

  describe("getSubscriptionTemplateId", () => {
    it("should return no-links template when files exceed 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS = "no-links-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: true, hasPdf: true, hasExcel: true, filesUnder2MB: false })).toBe("no-links-template");
    });

    it("should return no-links template for non-SJP when files exceed 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS = "no-links-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: false, hasPdf: true, hasExcel: false, filesUnder2MB: false })).toBe("no-links-template");
    });

    it("should return SJP PDF+Excel template when SJP with both formats under 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL = "sjp-pdf-excel-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: true, hasPdf: true, hasExcel: true, filesUnder2MB: true })).toBe("sjp-pdf-excel-template");
    });

    it("should return SJP Excel-only template when SJP with Excel only under 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY = "sjp-excel-only-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: true, hasPdf: false, hasExcel: true, filesUnder2MB: true })).toBe("sjp-excel-only-template");
    });

    it("should return non-SJP PDF template when non-SJP with PDF under 2MB", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF = "non-sjp-pdf-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: false, hasPdf: true, hasExcel: false, filesUnder2MB: true })).toBe("non-sjp-pdf-template");
    });

    it("should return no-links template when there are no files", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS = "no-links-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: false, hasPdf: false, hasExcel: false, filesUnder2MB: true })).toBe("no-links-template");
    });

    it("should return no-links template when SJP but no Excel and no PDF", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS = "no-links-template";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: true, hasPdf: false, hasExcel: false, filesUnder2MB: true })).toBe("no-links-template");
    });

    it("should fall back to GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION for no-links when new var not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "legacy-subscription-template";
      delete process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS;

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: false, hasPdf: false, hasExcel: false, filesUnder2MB: false })).toBe("legacy-subscription-template");
    });

    it("should fall back to GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY for non-SJP PDF when new var not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY = "legacy-pdf-template";
      delete process.env.GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF;

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(getSubscriptionTemplateId({ isSjp: false, hasPdf: true, hasExcel: false, filesUnder2MB: true })).toBe("legacy-pdf-template");
    });

    it("should throw when no-links template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS = "";
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(() => getSubscriptionTemplateId({ isSjp: false, hasPdf: false, hasExcel: false, filesUnder2MB: false })).toThrow(
        "GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS environment variable is not set"
      );
    });

    it("should throw when SJP PDF+Excel template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL = "";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(() => getSubscriptionTemplateId({ isSjp: true, hasPdf: true, hasExcel: true, filesUnder2MB: true })).toThrow(
        "GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL environment variable is not set"
      );
    });

    it("should throw when SJP Excel-only template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY = "";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(() => getSubscriptionTemplateId({ isSjp: true, hasPdf: false, hasExcel: true, filesUnder2MB: true })).toThrow(
        "GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY environment variable is not set"
      );
    });

    it("should throw when non-SJP PDF template is not set", async () => {
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF = "";
      process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY = "";

      const { getSubscriptionTemplateId } = await import("./template-config.js");
      expect(() => getSubscriptionTemplateId({ isSjp: false, hasPdf: true, hasExcel: false, filesUnder2MB: true })).toThrow(
        "GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF environment variable is not set"
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
  });

  describe("buildTemplateParameters", () => {
    it("should build template parameters with all new fields", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Civil And Family Daily Cause List",
        publicationDate: new Date("2025-01-20"),
        locationName: "Oxford Court",
        caseValue: "AB-1234"
      });

      expect(result).toEqual({
        locations: "Oxford Court",
        ListType: "Civil And Family Daily Cause List",
        content_date: "20 January 2025",
        start_page_link: "https://test-service.gov.uk",
        subscription_page_link: "https://test-service.gov.uk",
        display_locations: "yes",
        display_case: "yes",
        case: "AB-1234",
        display_case_num: "yes",
        case_num: "AB-1234",
        display_case_urn: "no",
        case_urn: "",
        display_summary: "no",
        summary_of_cases: ""
      });
    });

    it("should set display_case_num to no when no case value", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildTemplateParameters } = await import("./template-config.js");
      const result = buildTemplateParameters({
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2025-01-20"),
        locationName: "Oxford Court"
      });

      expect(result.display_case_num).toBe("no");
      expect(result.case_num).toBe("");
      expect(result.display_case_urn).toBe("no");
      expect(result.case_urn).toBe("");
    });
  });

  describe("buildEnhancedTemplateParameters", () => {
    it("should build enhanced template parameters with case summary and new fields", async () => {
      process.env.CATH_SERVICE_URL = "https://test-service.gov.uk";

      const { buildEnhancedTemplateParameters } = await import("./template-config.js");
      const result = buildEnhancedTemplateParameters({
        userName: "Jane Smith",
        hearingListName: "Civil And Family Daily Cause List",
        publicationDate: new Date("2025-02-10"),
        locationName: "Birmingham Court",
        caseSummary: "Case 123 - Smith v Jones",
        caseValue: "AB-123"
      });

      expect(result.display_summary).toBe("yes");
      expect(result.summary_of_cases).toBe("Case 123 - Smith v Jones");
      expect(result.display_case_num).toBe("yes");
      expect(result.case_num).toBe("AB-123");
      expect(result.display_case_urn).toBe("no");
      expect(result.case_urn).toBe("");
    });
  });
});
