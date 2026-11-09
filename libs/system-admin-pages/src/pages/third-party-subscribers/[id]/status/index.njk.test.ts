import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "index.njk";
const SUBSCRIBER_ID = "00000000-0000-0000-0000-000000000001";
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;

let env: nunjucks.Environment;

function buildStatusItems(locale: typeof en | typeof cy, selectedStatus?: string) {
  return STATUSES.map((value) => ({ value, text: locale.statuses[value], selected: value === selectedStatus }));
}

function renderPage(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, {
    ...locale,
    en,
    cy,
    lngParam: locale === cy ? "?lng=cy" : "",
    userId: SUBSCRIBER_ID,
    statusItems: buildStatusItems(locale, "ACTIVE"),
    ...overrides
  });
}

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("manage subscriber status template", () => {
  describe("heading and title", () => {
    it("should render the H1 and page title as Manage User Status", () => {
      const { $ } = renderPage();

      expect($("h1")).toHaveLength(1);
      expect($("h1").text().trim()).toBe("Manage User Status");
      expect($("title").text()).toContain("Manage User Status");
    });
  });

  describe("status select", () => {
    it("should render one labelled select with the three statuses and no empty option", () => {
      const { $ } = renderPage();

      const select = $("select#status");
      expect(select).toHaveLength(1);
      expect(select.attr("name")).toBe("status");
      expect($("label[for='status']").text().trim()).toBe("Status");
      const options = select.find("option");
      expect(options).toHaveLength(3);
      expect(options.map((_, el) => $(el).attr("value")).get()).toEqual(["PENDING", "ACTIVE", "SUSPENDED"]);
      expect(options.map((_, el) => $(el).text().trim()).get()).toEqual(["Pending", "Active", "Suspended"]);
    });

    it.each(STATUSES)("should pre-select %s when it is the current status", (status) => {
      const { $ } = renderPage(en, { statusItems: buildStatusItems(en, status) });

      const selected = $("select#status option[selected]");
      expect(selected).toHaveLength(1);
      expect(selected.attr("value")).toBe(status);
    });

    it("should not render radios", () => {
      const { $ } = renderPage();

      expect($("input[type='radio']")).toHaveLength(0);
      expect($(".govuk-radios")).toHaveLength(0);
    });
  });

  describe("form and actions", () => {
    it("should post to the current URL without browser validation", () => {
      const { $ } = renderPage();

      const form = $("main form");
      expect(form).toHaveLength(1);
      expect(form.attr("method")).toBe("post");
      expect(form.attr("action")).toBeUndefined();
      expect(form.attr("novalidate")).toBeDefined();
    });

    it("should render a Confirm submit button and a warning Cancel link to the manage page", () => {
      const { $ } = renderPage();

      const group = $("main form .govuk-button-group");
      const confirm = group.find("button");
      expect(confirm).toHaveLength(1);
      expect(confirm.text().trim()).toBe("Confirm");
      expect(confirm.hasClass("govuk-button--warning")).toBe(false);
      const cancel = group.find("a");
      expect(cancel).toHaveLength(1);
      expect(cancel.text().trim()).toBe("Cancel");
      expect(cancel.attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/manage`);
      expect(cancel.attr("role")).toBe("button");
      expect(cancel.hasClass("govuk-button")).toBe(true);
      expect(cancel.hasClass("govuk-button--warning")).toBe(true);
    });

    it("should render a back link to the manage page", () => {
      const { $ } = renderPage();

      const backLink = $("a.govuk-back-link");
      expect(backLink).toHaveLength(1);
      expect(backLink.attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/manage`);
      expect(backLink.text().trim()).toBe("Back");
    });
  });

  describe("errors", () => {
    it("should not render an error summary or inline error when there are no errors", () => {
      const { $ } = renderPage();

      assertNoErrors($);
      expect($(".govuk-error-message")).toHaveLength(0);
      expect($(".govuk-form-group--error")).toHaveLength(0);
    });

    it("should render the error summary linked to the select and the inline error", () => {
      const { $ } = renderPage(en, {
        errors: [{ text: en.errorSelectStatus, href: "#status" }],
        statusItems: buildStatusItems(en)
      });

      assertErrorSummary($, ["Select a status"]);
      expect($(".govuk-error-summary__title").text().trim()).toBe("There is a problem");
      expect($(".govuk-error-summary__list a").attr("href")).toBe("#status");
      expect($(".govuk-error-message").text()).toContain("Select a status");
      expect($("select#status").hasClass("govuk-select--error")).toBe(true);
      expect($("select#status option[selected]")).toHaveLength(0);
    });
  });

  describe("Welsh", () => {
    it("should render Welsh content and keep the language parameter on links", () => {
      const { $ } = renderPage(cy, { statusItems: buildStatusItems(cy, "PENDING") });

      expect($("h1").text().trim()).toBe("Rheoli Statws Defnyddiwr");
      expect($("label[for='status']").text().trim()).toBe("Statws");
      expect(
        $("select#status option")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["Yn yr arfaeth", "Gweithredol", "Wedi'i atal"]);
      expect($("main form button").text().trim()).toBe("Cadarnhau");
      const cancel = $("main form .govuk-button-group a");
      expect(cancel.text().trim()).toBe("Canslo");
      expect(cancel.attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/manage?lng=cy`);
      expect($("a.govuk-back-link").attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/manage?lng=cy`);
    });

    it("should render the Welsh error", () => {
      const { $ } = renderPage(cy, { errors: [{ text: cy.errorSelectStatus, href: "#status" }] });

      assertErrorSummary($, ["Dewiswch statws"]);
      expect($(".govuk-error-summary__title").text().trim()).toBe("Mae yna broblem");
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
