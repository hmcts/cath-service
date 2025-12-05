import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("head-analytics.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure(path.join(__dirname, "../"), {
      autoescape: true,
      noCache: true
    });
  });

  describe("Google Tag Manager", () => {
    it("should load GTM when analytics consent is given", () => {
      const html = env.render("components/head-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        cookieManager: {
          cookiePreferences: {
            analytics: true
          }
        }
      });

      expect(html).toContain("GTM-TEST123");
      expect(html).toContain("Google Tag Manager");
    });

    it("should not load GTM when analytics consent is false", () => {
      const html = env.render("components/head-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        cookieManager: {
          cookiePreferences: {
            analytics: false
          }
        }
      });

      expect(html).not.toContain("GTM-TEST123");
      expect(html).not.toContain("Google Tag Manager");
    });

    it("should not load GTM when no cookie preferences are set", () => {
      const html = env.render("components/head-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        cookieManager: {
          cookiePreferences: {}
        }
      });

      expect(html).not.toContain("GTM-TEST123");
      expect(html).not.toContain("Google Tag Manager");
    });

    it("should not load GTM when gtm config is missing", () => {
      const html = env.render("components/head-analytics.njk", {
        cookieManager: {
          cookiePreferences: {
            analytics: true
          }
        }
      });

      expect(html).not.toContain("Google Tag Manager");
    });
  });

  describe("Dynatrace", () => {
    it("should load Dynatrace when performance consent is given", () => {
      const html = env.render("components/head-analytics.njk", {
        dynatrace: { dynatraceUrl: "https://example.com/dynatrace.js" },
        cookieManager: {
          cookiePreferences: {
            performance: true
          }
        }
      });

      expect(html).toContain("https://example.com/dynatrace.js");
      expect(html).toContain("Dynatrace");
    });

    it("should not load Dynatrace when performance consent is false", () => {
      const html = env.render("components/head-analytics.njk", {
        dynatrace: { dynatraceUrl: "https://example.com/dynatrace.js" },
        cookieManager: {
          cookiePreferences: {
            performance: false
          }
        }
      });

      expect(html).not.toContain("https://example.com/dynatrace.js");
      expect(html).not.toContain("Dynatrace");
    });

    it("should not load Dynatrace when no cookie preferences are set", () => {
      const html = env.render("components/head-analytics.njk", {
        dynatrace: { dynatraceUrl: "https://example.com/dynatrace.js" },
        cookieManager: {
          cookiePreferences: {}
        }
      });

      expect(html).not.toContain("https://example.com/dynatrace.js");
      expect(html).not.toContain("Dynatrace");
    });

    it("should not load Dynatrace when dynatrace config is missing", () => {
      const html = env.render("components/head-analytics.njk", {
        cookieManager: {
          cookiePreferences: {
            performance: true
          }
        }
      });

      expect(html).not.toContain("Dynatrace");
    });
  });

  describe("Independent consent", () => {
    it("should load only GTM when only analytics consent is given", () => {
      const html = env.render("components/head-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        dynatrace: { dynatraceUrl: "https://example.com/dynatrace.js" },
        cookieManager: {
          cookiePreferences: {
            analytics: true,
            performance: false
          }
        }
      });

      expect(html).toContain("GTM-TEST123");
      expect(html).not.toContain("dynatrace.js");
    });

    it("should load only Dynatrace when only performance consent is given", () => {
      const html = env.render("components/head-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        dynatrace: { dynatraceUrl: "https://example.com/dynatrace.js" },
        cookieManager: {
          cookiePreferences: {
            analytics: false,
            performance: true
          }
        }
      });

      expect(html).not.toContain("GTM-TEST123");
      expect(html).toContain("dynatrace.js");
    });

    it("should load both when both consents are given", () => {
      const html = env.render("components/head-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        dynatrace: { dynatraceUrl: "https://example.com/dynatrace.js" },
        cookieManager: {
          cookiePreferences: {
            analytics: true,
            performance: true
          }
        }
      });

      expect(html).toContain("GTM-TEST123");
      expect(html).toContain("dynatrace.js");
    });
  });
});
