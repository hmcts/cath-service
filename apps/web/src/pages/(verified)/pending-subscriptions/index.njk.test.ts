import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/pending-subscriptions/index.njk";

describe("pending-subscriptions template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading and a location table with a remove action", () => {
      const data = {
        ...en,
        locations: [{ locationId: "42", name: "Birmingham Civil Court" }],
        confirmButton: en.confirmButton
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
      expect($("table th").eq(0).text()).toContain(en.tableHeaderLocation);
      expect($("table td").first().text()).toContain("Birmingham Civil Court");
      expect($('input[name="locationId"]').attr("value")).toBe("42");
      expect($('button[type="submit"]').text()).toContain(en.removeLink);
      expect($('a[href="/add-email-subscription"]').text()).toContain(en.addAnotherSubscription);
      assertNoErrors($);
    });

    it("should render the confirm button text passed by the controller", () => {
      const data = {
        ...en,
        locations: [{ locationId: "1", name: "Court A" }],
        confirmButton: en.confirmButton
      };

      const { $ } = render(env, TEMPLATE, data);

      const confirmForm = $('form input[name="action"][value="confirm"]').closest("form");
      expect(confirmForm.find("button").text()).toContain(en.confirmButton);
    });

    it("should render a case subscriptions table when case subscriptions are present", () => {
      const data = {
        ...en,
        locations: [],
        pendingCaseSubscriptions: [{ caseName: "R v Smith", caseNumber: "CASE-123", searchType: "CASE_ID", searchValue: "CASE-123" }],
        confirmButton: en.confirmSubscription
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("th").text()).toContain(en.caseNameLabel);
      expect($("th").text()).toContain(en.referenceNumberLabel);
      expect($("td").text()).toContain("R v Smith");
      expect($("td").text()).toContain("CASE-123");
      expect($('input[name="action"][value="remove-case"]').attr("value")).toBe("remove-case");
      assertNoErrors($);
    });

    it("should render an error summary and add-subscriptions button when nothing is pending", () => {
      const data = {
        ...en,
        locations: [],
        showBackToSearch: true,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorAtLeastOne, href: "#" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
      assertErrorSummary($, [en.errorAtLeastOne]);
      const addForm = $('form[action="/add-email-subscription"]');
      expect(addForm.find("button").text()).toContain(en.addSubscriptions);
    });
  });

  describe("Welsh content", () => {
    it("should render the heading and location table in Welsh", () => {
      const data = {
        ...cy,
        locale: "cy",
        locations: [{ locationId: "7", name: "Llys Sifil Caerdydd" }],
        confirmButton: cy.confirmButton
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($("table th").eq(0).text()).toContain(cy.tableHeaderLocation);
      expect($("table td").first().text()).toContain("Llys Sifil Caerdydd");
      expect($('button[type="submit"]').text()).toContain(cy.removeLink);
    });
  });

  describe("Remove buttons", () => {
    it("should use the link-button class with no inline style so the GOV.UK focus state applies", () => {
      const data = {
        ...en,
        locations: [{ locationId: "42", name: "Birmingham Civil Court" }],
        pendingCaseSubscriptions: [{ caseName: "Smith v Jones", caseNumber: "AB123" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      const removeButtons = $("button[type='submit']").filter((_, el) => $(el).text().trim() === en.removeLink);
      expect(removeButtons).toHaveLength(2);
      removeButtons.each((_, el) => {
        expect($(el).hasClass("app-link-button")).toBe(true);
        expect($(el).attr("style")).toBeUndefined();
      });
    });

    it("should render the Welsh remove text on the link-button", () => {
      const data = { ...cy, locations: [{ locationId: "42", name: "Llys Sifil Birmingham" }] };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.app-link-button").text().trim()).toBe(cy.removeLink);
    });
  });
});
