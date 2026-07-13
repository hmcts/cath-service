import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/non-strategic-upload-summary/index.njk";

const buildData = (lang: typeof en | typeof cy, extra: Record<string, unknown> = {}) => ({
  pageTitle: lang.pageTitle,
  heading: lang.heading,
  subHeading: lang.subHeading,
  courtName: lang.courtName,
  file: lang.file,
  listType: lang.listType,
  hearingStartDate: lang.hearingStartDate,
  sensitivity: lang.sensitivity,
  language: lang.language,
  displayFileDates: lang.displayFileDates,
  change: lang.change,
  confirmButton: lang.confirmButton,
  data: {
    courtName: "Central London County Court",
    file: "example-list.xlsx",
    listType: "SSCS Daily List",
    hearingStartDate: "14 July 2026",
    sensitivity: "Public",
    language: "English",
    displayFileDates: "14 July 2026 to 21 July 2026"
  },
  ...extra
});

describe("non-strategic-upload-summary template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and sub heading", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
      expect($("h2").text()).toContain(en.subHeading);
    });

    it("should render summary list keys, values and change links", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toEqual([en.courtName, en.file, en.listType, en.hearingStartDate, en.sensitivity, en.language, en.displayFileDates]);

      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(values).toContain("Central London County Court");
      expect(values).toContain("example-list.xlsx");
      expect(values).toContain("14 July 2026 to 21 July 2026");

      expect($('.govuk-summary-list__actions a[href="/non-strategic-upload#court"]').length).toBe(1);
      expect($('.govuk-summary-list__actions a[href="/non-strategic-upload#displayFrom-day"]').length).toBe(1);
      expect($(".govuk-summary-list__actions a").first().text()).toContain(en.change);
    });

    it("should render the confirm button inside a post form", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form[method='post']").length).toBe(1);
      expect($("form button.govuk-button").text()).toContain(en.confirmButton);
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and summary keys", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
      expect($("h2").text()).toContain(cy.subHeading);
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(cy.courtName);
      expect(keys).toContain(cy.language);
      expect($("form button.govuk-button").text()).toContain(cy.confirmButton);
    });
  });

  describe("Error state", () => {
    it("should render an error summary when errors are present", () => {
      // Arrange
      const errorMessage = "We could not process your upload. Please try again.";
      const data = buildData(en, { errors: [{ text: errorMessage, href: "#" }] });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [errorMessage]);
    });
  });
});
