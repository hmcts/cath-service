import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
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
    ...overrides
  };
}

function renderPage(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, baseData(locale, overrides));
}

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("manage subscriber template", () => {
  describe("Test connection button", () => {
    it("should render a primary (green) submit button in a POST form without an action", () => {
      const { $ } = renderPage();

      const form = $("main form");
      expect(form).toHaveLength(1);
      expect(form.attr("method")).toBe("post");
      expect(form.attr("action")).toBeUndefined();
      const button = form.find("button");
      expect(button).toHaveLength(1);
      expect(button.text().trim()).toBe("Test connection");
      expect(button.hasClass("govuk-button")).toBe(true);
      expect(button.hasClass("govuk-button--secondary")).toBe(false);
      expect(button.hasClass("govuk-button--warning")).toBe(false);
      expect(button.attr("data-prevent-double-click")).toBe("true");
    });

    it("should render the heading, then the form, then the summary list", () => {
      const { $ } = renderPage();

      const order = $("main h1, main form, main .govuk-summary-list")
        .map((_, el) => el.tagName)
        .get();
      expect(order).toEqual(["h1", "form", "dl"]);
    });

    it("should render the Welsh button label", () => {
      const { $ } = renderPage(cy);

      expect($("main form button").text().trim()).toBe("Profi cysylltiad");
    });

    it("should keep the other three actions", () => {
      const { $ } = renderPage();

      const links = $(".govuk-button-group a.govuk-button")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(links).toEqual(["Manage subscriptions", "Manage OAuth configuration", "Delete subscriber"]);
    });
  });

  describe("result box", () => {
    it("should not render a result box or a GOV.UK notification banner when there is no result", () => {
      const { $ } = renderPage();

      expect($(".connection-result")).toHaveLength(0);
      expect($(".govuk-notification-banner")).toHaveLength(0);
    });

    it("should render a success box between the form and the summary list", () => {
      const { $ } = renderPage(en, {
        connectionResult: { isSuccess: true, title: en.connectionTest.succeededTitle, message: en.connectionTest.succeeded }
      });

      const box = $(".connection-result");
      expect(box).toHaveLength(1);
      expect(box.hasClass("connection-result--success")).toBe(true);
      expect(box.hasClass("connection-result--fail")).toBe(false);
      expect(box.attr("role")).toBe("alert");
      expect(box.find(".connection-result__title").text().trim()).toBe("Succeeded");
      expect(box.find(".govuk-body")).toHaveLength(2);
      expect(box.find(".govuk-body").eq(1).text().trim()).toBe("Connection to third party succeeded.");
      expect($(".govuk-notification-banner")).toHaveLength(0);
      const order = $("main h1, main form, main .connection-result, main .govuk-summary-list")
        .map((_, el) => (el.tagName === "div" ? "result" : el.tagName))
        .get();
      expect(order).toEqual(["h1", "form", "result", "dl"]);
    });

    it("should render a failure box with the reason line", () => {
      const { $ } = renderPage(en, {
        connectionResult: {
          isSuccess: false,
          title: en.connectionTest.failedTitle,
          message: en.connectionTest.tokenFailure,
          reason: "HTTP status 401"
        }
      });

      const box = $(".connection-result");
      expect(box).toHaveLength(1);
      expect(box.hasClass("connection-result--fail")).toBe(true);
      expect(box.hasClass("connection-result--success")).toBe(false);
      expect(box.attr("role")).toBe("alert");
      expect(box.find(".connection-result__title").text().trim()).toBe("Failed");
      expect(box.find(".govuk-body").eq(1).text().trim()).toBe("Failed to generate access token.");
      expect(box.find(".govuk-body").eq(2).text().trim()).toBe("Reason: HTTP status 401");
    });

    it("should render a failure box without a reason line when there is no reason", () => {
      const { $ } = renderPage(en, {
        connectionResult: { isSuccess: false, title: en.connectionTest.failedTitle, message: en.connectionTest.error }
      });

      const box = $(".connection-result");
      expect(box.find(".govuk-body")).toHaveLength(2);
      expect(box.find(".govuk-body").eq(1).text().trim()).toBe("Error connecting to third party. Please try again later.");
    });

    it("should render the Welsh title, message and reason label", () => {
      const { $ } = renderPage(cy, {
        connectionResult: {
          isSuccess: false,
          title: cy.connectionTest.failedTitle,
          message: cy.connectionTest.destinationFailure,
          reason: `${cy.connectionTest.reasons.httpStatus} 500`
        }
      });

      const box = $(".connection-result");
      expect(box.find(".connection-result__title").text().trim()).toBe("Methodd");
      expect(box.find(".govuk-body").eq(1).text().trim()).toBe("Methwyd ag anfon cais i'r URL cyrchfan.");
      expect(box.find(".govuk-body").eq(2).text().trim()).toBe("Rheswm: Statws HTTP 500");
    });

    it("should escape markup in the message and reason", () => {
      const { $, html } = renderPage(en, {
        connectionResult: { isSuccess: false, title: "Failed", message: "<script>alert(1)</script>", reason: "<img src=x onerror=alert(1)>" }
      });

      const box = $(".connection-result");
      expect(box.find("script")).toHaveLength(0);
      expect(box.find("img")).toHaveLength(0);
      expect(box.find(".govuk-body").eq(1).text()).toBe("<script>alert(1)</script>");
      expect(html).not.toContain("<script>alert(1)</script>");
    });
  });

  describe("locale parity", () => {
    it("should have identical key structures in en and cy", () => {
      expect(keyPaths(en)).toEqual(keyPaths(cy));
    });

    it("should not contain translation placeholders in cy", () => {
      expect(JSON.stringify(cy)).not.toContain("WELSH TRANSLATION REQUIRED");
    });

    it("should have no empty strings in en or cy", () => {
      for (const value of [...leafValues(en), ...leafValues(cy)]) {
        expect(value.trim()).not.toBe("");
      }
    });
  });
});

function keyPaths(value: object, prefix = ""): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) => (typeof child === "object" && child !== null ? keyPaths(child, `${prefix}${key}.`) : [`${prefix}${key}`]))
    .sort();
}

function leafValues(value: object): string[] {
  return Object.values(value).flatMap((child) => (typeof child === "object" && child !== null ? leafValues(child) : [String(child)]));
}
