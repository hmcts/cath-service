import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { cookiePolicyCy as cy, cookiePolicyEn as en } from "@hmcts/web-core";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(core)/cookie-policy/index.njk";

describe("cookie-policy template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and main sections", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      expect($("h2").text()).toContain(en.mainHeading);
      expect($("h2").text()).toContain(en.changeSettings.heading);
      expect($("h3").text()).toContain(en.sections.analytics.heading);
      expect($("h3").text()).toContain(en.sections.performance.heading);
    });

    it("should render the manage cookies link", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="${en.intro.manageCookiesUrl}"]`);
      expect(link.length).toBeGreaterThan(0);
      expect(link.text()).toContain(en.intro.manageCookiesLink);
    });

    it("should render the cookie tables with header row", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("table").length).toBeGreaterThan(0);
      const headerText = $("table thead").first().text();
      expect(headerText).toContain(en.tableHeaders.name);
      expect(headerText).toContain(en.tableHeaders.purpose);
      expect(headerText).toContain(en.tableHeaders.expiry);
    });

    it("should render the settings form posting to /cookie-policy with the csrf token and save button", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      const form = $('form[action="/cookie-policy"]');
      expect(form.attr("method")).toBe("POST");
      expect($('input[name="_csrf"]').attr("value")).toBe("test-csrf");
      expect($('input[name="analytics"]').length).toBe(2);
      expect($('input[name="performance"]').length).toBe(2);
      expect($("button").text()).toContain(en.changeSettings.saveButton);
    });
  });

  describe("radio selection state", () => {
    it("should check the enabled radios when preferences are enabled", () => {
      const data = { ...en, cookiePreferences: { analytics: true, performance: true }, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="analytics"][value="on"]').attr("checked")).toBeDefined();
      expect($('input[name="performance"][value="on"]').attr("checked")).toBeDefined();
    });

    it("should check the disabled radios when preferences are not enabled", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="analytics"][value="off"]').attr("checked")).toBeDefined();
      expect($('input[name="performance"][value="off"]').attr("checked")).toBeDefined();
    });
  });

  describe("success banner", () => {
    it("should render the success notification banner when saved is true", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: true, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      const banner = $(".govuk-notification-banner");
      expect(banner.length).toBe(1);
      expect(banner.text()).toContain(en.successMessage);
    });

    it("should not render the success banner when saved is false", () => {
      const data = { ...en, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-notification-banner").length).toBe(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading and settings heading", () => {
      const data = { ...cy, cookiePreferences: {}, categories: {}, saved: false, csrfToken: "test-csrf" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("h2").text()).toContain(cy.changeSettings.heading);
      expect($("button").text()).toContain(cy.changeSettings.saveButton);
    });
  });
});
