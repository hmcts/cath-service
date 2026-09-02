import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./reject-reasons-cy.js";
import { en } from "./reject-reasons-en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "reject-reasons.njk";

describe("reject-reasons.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../../libs/web-core/src/views");
    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("English content", () => {
    it("should render the heading, hint, checkboxes and continue button", () => {
      const data = {
        pageTitle: en.pageTitle,
        selectAllText: en.selectAllText,
        checkboxLegend: en.checkboxLegend,
        reasons: en.reasons,
        continueButton: en.continueButton,
        id: "app-123",
        selectedReasons: {},
        hideLanguageToggle: true
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
      expect($(".govuk-hint").text()).toContain(en.selectAllText);
      assertNoErrors($);

      const checkboxLabels = $(".govuk-checkboxes__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(checkboxLabels).toContain(en.reasons.notAccredited);
      expect(checkboxLabels).toContain(en.reasons.invalidId);
      expect(checkboxLabels).toContain(en.reasons.detailsMismatch);

      const checkboxValues = $("input[type='checkbox']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(checkboxValues).toEqual(["notAccredited", "invalidId", "detailsMismatch"]);

      expect($("form").attr("method")).toBe("post");
      expect($("button").text()).toContain(en.continueButton);
    });

    it("should pre-check checkboxes for selected reasons", () => {
      const data = {
        pageTitle: en.pageTitle,
        selectAllText: en.selectAllText,
        checkboxLegend: en.checkboxLegend,
        reasons: en.reasons,
        continueButton: en.continueButton,
        id: "app-123",
        selectedReasons: { notAccredited: "on", detailsMismatch: "on" },
        hideLanguageToggle: true
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input[value='notAccredited']").attr("checked")).toBeDefined();
      expect($("input[value='detailsMismatch']").attr("checked")).toBeDefined();
      expect($("input[value='invalidId']").attr("checked")).toBeUndefined();
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, hint and checkbox labels", () => {
      const data = {
        pageTitle: cy.pageTitle,
        selectAllText: cy.selectAllText,
        checkboxLegend: cy.checkboxLegend,
        reasons: cy.reasons,
        continueButton: cy.continueButton,
        id: "app-123",
        selectedReasons: {},
        hideLanguageToggle: true
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($(".govuk-hint").text()).toContain(cy.selectAllText);

      const checkboxLabels = $(".govuk-checkboxes__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(checkboxLabels).toContain(cy.reasons.notAccredited);
      expect(checkboxLabels).toContain(cy.reasons.invalidId);
      expect(checkboxLabels).toContain(cy.reasons.detailsMismatch);

      expect($("button").text()).toContain(cy.continueButton);
    });
  });

  describe("Validation errors", () => {
    it("should render the error summary when no reason is selected", () => {
      const data = {
        pageTitle: en.pageTitle,
        selectAllText: en.selectAllText,
        checkboxLegend: en.checkboxLegend,
        reasons: en.reasons,
        continueButton: en.continueButton,
        id: "app-123",
        selectedReasons: {},
        errors: [{ text: en.errorMessages.selectAtLeastOne, href: "#notAccredited" }],
        hideLanguageToggle: true
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessages.selectAtLeastOne]);
      expect($(".govuk-error-message").text()).toContain(en.errorMessages.selectAtLeastOne);
      expect($("form")).toHaveLength(1);
    });
  });

  describe("Load failure", () => {
    it("should show the load error message and hide the form", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.loadFailed,
        hideLanguageToggle: true
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-error-summary").text()).toContain(en.errorMessages.loadFailed);
      expect($("form")).toHaveLength(0);
    });
  });
});
