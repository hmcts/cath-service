import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-locations/index.njk";

const buildTableRows = () => [
  [{ html: '<a href="/blob-explorer-publications?locationId=1" class="govuk-link">Location 1</a>' }, { text: "5", format: "numeric" }],
  [{ html: '<a href="/blob-explorer-publications?locationId=2" class="govuk-link">Location 2</a>' }, { text: "3", format: "numeric" }]
];

describe("blob-explorer-locations template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and description", () => {
      // Arrange
      const data = { ...en, tableRows: buildTableRows(), locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.locationsTitle);
      expect($("p.govuk-body").first().text()).toContain(en.locationsDescription);
    });

    it("should render a table row per location with publication links and counts", () => {
      // Arrange
      const data = { ...en, tableRows: buildTableRows(), locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const headings = $(".govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toContain(en.locationsTableHeadingLocation);
      expect(headings).toContain(en.locationsTableHeadingPublications);

      expect($('a[href="/blob-explorer-publications?locationId=1"]').text()).toBe("Location 1");
      expect($('a[href="/blob-explorer-publications?locationId=2"]').text()).toBe("Location 2");
      expect($(".govuk-table__body .govuk-table__row")).toHaveLength(2);
    });

    it("should not render an error summary when there is no error", () => {
      // Arrange
      const data = { ...en, tableRows: buildTableRows(), locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render an empty state message when there are no rows", () => {
      // Arrange
      const data = { ...en, tableRows: [], locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-table")).toHaveLength(0);
      expect($.text()).toContain("No publications found");
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading", () => {
      // Arrange
      const data = { ...cy, tableRows: buildTableRows(), locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.locationsTitle);
      expect($("p.govuk-body").first().text()).toContain(cy.locationsDescription);
    });
  });

  describe("Error state", () => {
    it("should render an error summary when the controller passes an error", () => {
      // Arrange
      const data = { ...en, error: en.locationsError, tableRows: [], locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.locationsError]);
    });
  });
});
