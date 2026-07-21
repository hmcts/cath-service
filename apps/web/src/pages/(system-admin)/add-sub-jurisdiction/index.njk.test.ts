import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/add-sub-jurisdiction/index.njk";

const jurisdictionItems = [
  { value: "", text: en.jurisdictionPlaceholder },
  { value: "1", text: "Civil" },
  { value: "2", text: "Family" }
];

const buildData = (content: typeof en, overrides: Record<string, unknown> = {}) => ({
  ...content,
  jurisdictionItems,
  data: { jurisdictionId: "", name: "", welshName: "" },
  errors: undefined,
  ...overrides
});

describe("add-sub-jurisdiction template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the jurisdiction select with placeholder and options", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const options = $("#jurisdictionId option");
      expect(options).toHaveLength(3);
      expect(options.first().text()).toBe(en.jurisdictionPlaceholder);
      expect($("#jurisdictionId").prev("label, .govuk-label").text().trim()).toContain(en.jurisdictionLabel);
    });

    it("should render name and welsh name inputs with hints", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#name")).toHaveLength(1);
      expect($("input#welshName")).toHaveLength(1);
      expect($("#name-hint").text().trim()).toBe(en.nameHint);
      expect($("#welshName-hint").text().trim()).toBe(en.welshNameHint);
    });

    it("should render the save button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text()).toContain(en.saveButtonText);
    });

    it("should preserve submitted values in the inputs", () => {
      const data = buildData(en, {
        data: { jurisdictionId: "1", name: "Civil Court", welshName: "Llys Sifil" }
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#name").attr("value")).toBe("Civil Court");
      expect($("input#welshName").attr("value")).toBe("Llys Sifil");
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and button", () => {
      const data = buildData(cy, {
        jurisdictionItems: [{ value: "", text: cy.jurisdictionPlaceholder }]
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($("button.govuk-button").text()).toContain(cy.saveButtonText);
      expect($("#name-hint").text().trim()).toBe(cy.nameHint);
    });
  });

  describe("Error states", () => {
    it("should render the error summary with field messages", () => {
      const errors = [
        { text: "Select a jurisdiction", href: "#jurisdictionId" },
        { text: "Enter a name", href: "#name" }
      ];
      const data = buildData(en, { errors });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, ["Select a jurisdiction", "Enter a name"]);
      expect($("#name-error").text()).toContain("Enter a name");
    });
  });
});
