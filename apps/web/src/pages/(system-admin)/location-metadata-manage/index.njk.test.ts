import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/location-metadata-manage/index.njk";
const LOCATION_NAME = "Central London County Court";
const WELSH_LOCATION_NAME = "Llys Sirol Canol Llundain";

const baseData = (content: typeof en | typeof cy, overrides: Record<string, unknown> = {}) => ({
  ...content,
  locationName: LOCATION_NAME,
  cautionMessage: "",
  welshCautionMessage: "",
  noListMessage: "",
  welshNoListMessage: "",
  hasExistingMetadata: false,
  errors: undefined,
  ...overrides
});

describe("location-metadata-manage template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the heading with the location name", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(`${en.heading} ${LOCATION_NAME}`);
    });

    it("should render all four message textareas with their labels", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("textarea#cautionMessage")).toHaveLength(1);
      expect($("textarea#welshCautionMessage")).toHaveLength(1);
      expect($("textarea#noListMessage")).toHaveLength(1);
      expect($("textarea#welshNoListMessage")).toHaveLength(1);
      const labels = $("label.govuk-label--m")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(en.cautionMessageLabel);
      expect(labels).toContain(en.welshCautionMessageLabel);
      expect(labels).toContain(en.noListMessageLabel);
      expect(labels).toContain(en.welshNoListMessageLabel);
    });

    it("should pre-fill the textareas with existing metadata values", () => {
      const data = baseData(en, {
        cautionMessage: "Be careful",
        welshCautionMessage: "Byddwch yn ofalus",
        noListMessage: "No list today",
        welshNoListMessage: "Dim rhestr heddiw",
        hasExistingMetadata: true
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($("textarea#cautionMessage").val()).toBe("Be careful");
      expect($("textarea#welshCautionMessage").val()).toBe("Byddwch yn ofalus");
      expect($("textarea#noListMessage").val()).toBe("No list today");
      expect($("textarea#welshNoListMessage").val()).toBe("Dim rhestr heddiw");
    });

    it("should render only the create button when there is no existing metadata", () => {
      const data = baseData(en, { hasExistingMetadata: false });

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      const buttonValues = $("button[name='action']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(buttonValues).toEqual(["create"]);
      expect($("button[name='action'][value='create']").text().trim()).toBe(en.createButtonText);
    });

    it("should render update and delete buttons when metadata already exists", () => {
      const data = baseData(en, { hasExistingMetadata: true });

      const { $ } = render(env, TEMPLATE, data);

      const buttonValues = $("button[name='action']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(buttonValues).toEqual(["update", "delete"]);
      expect($("button[name='action'][value='update']").text().trim()).toBe(en.updateButtonText);
      expect($("button[name='action'][value='delete']").text().trim()).toBe(en.deleteButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when a validation error exists", () => {
      const data = baseData(en, {
        errors: [{ text: en.atLeastOneMessageRequired, href: "#cautionMessage" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.atLeastOneMessageRequired]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and message labels", () => {
      const data = baseData(cy, { locationName: WELSH_LOCATION_NAME });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(`${cy.heading} ${WELSH_LOCATION_NAME}`);
      const labels = $("label.govuk-label--m")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(cy.cautionMessageLabel);
      expect(labels).toContain(cy.welshNoListMessageLabel);
    });

    it("should render the Welsh create button", () => {
      const data = baseData(cy, { locationName: WELSH_LOCATION_NAME });

      const { $ } = render(env, TEMPLATE, data);

      expect($("button[name='action'][value='create']").text().trim()).toBe(cy.createButtonText);
    });

    it("should render the Welsh error summary", () => {
      const data = baseData(cy, {
        locationName: WELSH_LOCATION_NAME,
        errors: [{ text: cy.atLeastOneMessageRequired, href: "#cautionMessage" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.atLeastOneMessageRequired]);
    });
  });
});
