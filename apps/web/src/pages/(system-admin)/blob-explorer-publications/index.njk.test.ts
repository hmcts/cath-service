import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-publications/index.njk";

const buildTableRows = () => [
  [
    { html: '<a href="/blob-explorer-flat-file?artefactId=abc-123" class="govuk-link">abc-123</a>' },
    { text: "Civil Daily Cause List" },
    { text: "01/01/2024 00:00:00" },
    { text: "02/01/2024 00:00:00" }
  ]
];

describe("blob-explorer-publications template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and description", () => {
      const data = { ...en, tableRows: buildTableRows(), locationId: "123", locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.header);
      expect($("p.govuk-body").first().text()).toContain(en.publicationsDescription);
    });

    it("should render a table with the publication headings and rows", () => {
      const data = { ...en, tableRows: buildTableRows(), locationId: "123", locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const headings = $(".govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toEqual([
        en.publicationsTableHeadingArtefactId,
        en.publicationsTableHeadingListType,
        en.publicationsTableHeadingDisplayFrom,
        en.publicationsTableHeadingDisplayTo
      ]);

      const link = $('a[href="/blob-explorer-flat-file?artefactId=abc-123"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toBe("abc-123");
    });

    it("should not render an error summary when there is no error", () => {
      const data = { ...en, tableRows: buildTableRows(), locationId: "123", locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render the empty state when there are no publications", () => {
      const data = { ...en, tableRows: [], locationId: "123", locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-table")).toHaveLength(0);
      expect($("body").text()).toContain("No publications found for this location.");
    });

    it("should render an error summary when an error is passed", () => {
      const data = { ...en, error: en.publicationsError, tableRows: [], locationId: "123", locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.publicationsError]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and description", () => {
      const data = { ...cy, tableRows: buildTableRows(), locationId: "123", locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.header);
      expect($("p.govuk-body").first().text()).toContain(cy.publicationsDescription);
    });
  });
});
