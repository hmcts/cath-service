import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "index.njk";
const SUBSCRIBER_ID = "00000000-0000-0000-0000-000000000001";

let env: nunjucks.Environment;

function baseData(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return {
    ...locale,
    en,
    cy,
    lngParam: locale === cy ? "?lng=cy" : "",
    userId: SUBSCRIBER_ID,
    name: "Test Corp",
    createdAt: "15/01/2026",
    subscriptionCount: 2,
    statusLabel: locale.statuses.PENDING,
    ...overrides
  };
}

function renderPage(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, baseData(locale, overrides));
}

function statusRow($: CheerioAPI) {
  return $(".govuk-summary-list__row").filter((_, row) => $(row).find(".govuk-summary-list__key").text().trim() === en.tableHeadings.status);
}

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("manage subscriber template", () => {
  describe("status row", () => {
    it("should render the status as the last summary list row", () => {
      const { $ } = renderPage();

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toEqual(["Name", "Created date", "Number of subscriptions", "Status"]);
    });

    it.each([
      ["Pending", en.statuses.PENDING],
      ["Active", en.statuses.ACTIVE],
      ["Suspended", en.statuses.SUSPENDED]
    ])("should show the %s status label", (expected, statusLabel) => {
      const { $ } = renderPage(en, { statusLabel });

      expect(statusRow($).find(".govuk-summary-list__value").text().trim()).toBe(expected);
    });

    it("should render a Change link to the status page with visually hidden context", () => {
      const { $ } = renderPage();

      const link = statusRow($).find(".govuk-summary-list__actions a");
      expect(link).toHaveLength(1);
      expect(link.attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/status`);
      expect(link.find(".govuk-visually-hidden").text().trim()).toBe("Status");
      expect(link.text().replace(/\s+/g, " ").trim()).toBe("Change Status");
    });

    it("should only render a Change link on the status row", () => {
      const { $ } = renderPage();

      expect($(".govuk-summary-list__actions a")).toHaveLength(1);
    });

    it("should keep the Welsh language parameter on the Change link", () => {
      const { $ } = renderPage(cy);

      const row = $(".govuk-summary-list__row").last();
      expect(row.find(".govuk-summary-list__key").text().trim()).toBe("Statws");
      expect(row.find(".govuk-summary-list__value").text().trim()).toBe("Yn yr arfaeth");
      const link = row.find(".govuk-summary-list__actions a");
      expect(link.attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/status?lng=cy`);
      expect(link.text().replace(/\s+/g, " ").trim()).toBe("Newid Statws");
    });
  });

  describe("actions", () => {
    it("should keep the existing three actions", () => {
      const { $ } = renderPage();

      const links = $(".govuk-button-group a.govuk-button")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(links).toEqual(["Manage subscriptions", "Manage OAuth configuration", "Delete subscriber"]);
    });
  });

  describe("locale parity", () => {
    it("should have identical key structures in en and cy", () => {
      expect(keyPaths(en)).toEqual(keyPaths(cy));
    });

    it("should not contain translation placeholders in cy", () => {
      expect(JSON.stringify(cy)).not.toContain("WELSH TRANSLATION REQUIRED");
    });
  });
});

function keyPaths(value: object, prefix = ""): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) => (typeof child === "object" && child !== null ? keyPaths(child, `${prefix}${key}.`) : [`${prefix}${key}`]))
    .sort();
}
