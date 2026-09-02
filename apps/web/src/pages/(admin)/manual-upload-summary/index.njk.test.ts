import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/manual-upload-summary/index.njk";

const sampleData = {
  courtName: "Manchester Crown Court",
  file: "cause-list.json",
  listType: "Civil Daily Cause List",
  hearingStartDate: "1 January 2026",
  sensitivity: "Public",
  language: "English",
  displayFileDates: "1 January 2026 to 2 January 2026"
};

function baseData(lang: typeof en | typeof cy) {
  return {
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
    data: sampleData
  };
}

describe("manual-upload-summary template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([
        path.join(__dirname, "../../"), // apps/web/src/pages/
        path.join(__dirname, "../../../../../../libs/web-core/src/views")
      ]);
    });

    it("should render the English heading and sub-heading", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
      expect($("h2").text()).toContain(en.subHeading);
    });

    it("should render the English page title", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("title").text()).toContain(en.pageTitle);
    });

    it("should render the summary list keys and values", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toEqual([en.courtName, en.file, en.listType, en.hearingStartDate, en.sensitivity, en.language, en.displayFileDates]);

      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(values).toEqual([
        sampleData.courtName,
        sampleData.file,
        sampleData.listType,
        sampleData.hearingStartDate,
        sampleData.sensitivity,
        sampleData.language,
        sampleData.displayFileDates
      ]);
    });

    it("should render change links pointing back to the manual upload page", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      const hrefs = $(".govuk-summary-list__actions a")
        .map((_, el) => $(el).attr("href"))
        .get();
      expect(hrefs).toEqual([
        "/manual-upload#court",
        "/manual-upload#file",
        "/manual-upload#listType",
        "/manual-upload#hearingStartDate-day",
        "/manual-upload#sensitivity",
        "/manual-upload#language",
        "/manual-upload#displayFrom-day"
      ]);
      expect($(".govuk-summary-list__actions a").first().text()).toContain(en.change);
    });

    it("should render the confirm button inside a post form", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      expect($("form button").text()).toContain(en.confirmButton);
    });

    it("should render the Welsh page title", () => {
      const data = baseData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("title").text()).toContain(cy.pageTitle);
    });

    it("should render Welsh heading, all summary keys, change links and confirm button", () => {
      const data = baseData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($("h2").text()).toContain(cy.subHeading);
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toEqual([cy.courtName, cy.file, cy.listType, cy.hearingStartDate, cy.sensitivity, cy.language, cy.displayFileDates]);

      const changeLinks = $(".govuk-summary-list__actions a")
        .map((_, el) => $(el).text())
        .get();
      for (const link of changeLinks) {
        expect(link).toContain(cy.change);
      }

      expect($("form button").text()).toContain(cy.confirmButton);
    });

    it("should not render an error summary even when errors are passed (template has no error block)", () => {
      const data = { ...baseData(en), errors: [{ text: "We could not process your upload. Please try again.", href: "#" }] };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "pageTitle",
        "heading",
        "subHeading",
        "courtName",
        "file",
        "listType",
        "hearingStartDate",
        "sensitivity",
        "language",
        "displayFileDates",
        "change",
        "confirmButton"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
