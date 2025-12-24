import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("body-start-analytics.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure(path.join(__dirname, "../"), {
      autoescape: true,
      noCache: true
    });
  });

  describe("Google Tag Manager noscript", () => {
    it("should load GTM noscript when analytics consent is given", () => {
      const html = env.render("components/body-start-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        cookieManager: {
          cookiePreferences: {
            analytics: true
          }
        }
      });

      expect(html).toContain("GTM-TEST123");
      expect(html).toContain("noscript");
      expect(html).toContain("iframe");
    });

    it("should not load GTM noscript when analytics consent is false", () => {
      const html = env.render("components/body-start-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        cookieManager: {
          cookiePreferences: {
            analytics: false
          }
        }
      });

      expect(html).not.toContain("GTM-TEST123");
      expect(html).not.toContain("iframe");
    });

    it("should not load GTM noscript when no cookie preferences are set", () => {
      const html = env.render("components/body-start-analytics.njk", {
        gtm: { containerId: "GTM-TEST123" },
        cookieManager: {
          cookiePreferences: {}
        }
      });

      expect(html).not.toContain("GTM-TEST123");
    });

    it("should not load GTM noscript when gtm config is missing", () => {
      const html = env.render("components/body-start-analytics.njk", {
        cookieManager: {
          cookiePreferences: {
            analytics: true
          }
        }
      });

      expect(html).not.toContain("iframe");
    });
  });
});
