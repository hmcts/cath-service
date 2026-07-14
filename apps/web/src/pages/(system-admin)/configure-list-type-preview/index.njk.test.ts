import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import * as cy from "./cy.js";
import * as en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/configure-list-type-preview/index.njk";

const data = {
  name: "MY_LIST_TYPE",
  friendlyName: "My List Type",
  welshFriendlyName: "Fy Math o Restr",
  shortenedFriendlyName: "My List",
  url: "my-list-type",
  defaultSensitivity: "PUBLIC",
  allowedProvenance: ["MANUAL_UPLOAD", "SJP"],
  isNonStrategic: true
};

describe("configure-list-type-preview template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and description", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil, Family" };

      const { $ } = render(env, TEMPLATE, templateData);

      expect($("h1").text()).toContain(en.configureListType.preview.title);
      expect($(".govuk-body").first().text()).toContain(en.configureListType.preview.description);
    });

    it("should render the summary list rows with the submitted data", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil, Family" };

      const { $, html } = render(env, TEMPLATE, templateData);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(en.configureListType.preview.nameRow);
      expect(keys).toContain(en.configureListType.preview.subJurisdictionsRow);

      expect(html).toContain("MY_LIST_TYPE");
      expect(html).toContain("My List Type");
      expect(html).toContain("Fy Math o Restr");
      expect(html).toContain("my-list-type");
      expect(html).toContain("PUBLIC");
      expect(html).toContain("MANUAL_UPLOAD, SJP");
      expect(html).toContain("Civil, Family");
    });

    it("should render Yes for a non-strategic list type", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil" };

      const { html } = render(env, TEMPLATE, templateData);

      expect(html).toContain(en.configureListType.preview.yesOption);
    });

    it("should render No when the list type is strategic", () => {
      const templateData = { t: en, data: { ...data, isNonStrategic: false }, subJurisdictionsText: "Civil" };

      const { html } = render(env, TEMPLATE, templateData);

      expect(html).toContain(en.configureListType.preview.noOption);
    });

    it("should render change links pointing to the enter details and sub jurisdictions pages", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil" };

      const { $ } = render(env, TEMPLATE, templateData);

      const hrefs = $(".govuk-summary-list__actions a")
        .map((_, el) => $(el).attr("href"))
        .get();
      expect(hrefs).toContain("/configure-list-type-enter-details");
      expect(hrefs).toContain("/configure-list-type-select-sub-jurisdictions");
    });

    it("should render the confirm button inside a post form", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil" };

      const { $ } = render(env, TEMPLATE, templateData);

      expect($("form[method='post'] button").text()).toContain(en.common.confirm);
    });

    it("should not render an error summary when no error is passed", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil" };

      const { $ } = render(env, TEMPLATE, templateData);

      assertNoErrors($);
    });

    it("should render an error summary when an error is passed", () => {
      const templateData = { t: en, data, subJurisdictionsText: "Civil", error: "Failed to save list type" };

      const { $ } = render(env, TEMPLATE, templateData);

      assertErrorSummary($, ["Failed to save list type"]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and confirm button", () => {
      const templateData = { t: cy, data, subJurisdictionsText: "Sifil, Teulu" };

      const { $ } = render(env, TEMPLATE, templateData);

      expect($("h1").text()).toContain(cy.configureListType.preview.title);
      expect($("form[method='post'] button").text()).toContain(cy.common.confirm);
    });
  });
});
