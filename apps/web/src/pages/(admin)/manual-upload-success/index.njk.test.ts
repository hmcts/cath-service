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

const TEMPLATE = "(admin)/manual-upload-success/index.njk";

describe("manual-upload-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template rendering", () => {
    it("should render the success panel and navigation links in English", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("title").text()).toContain(en.pageTitle);
      const panel = $(".govuk-panel");
      expect(panel.find(".govuk-panel__title").text()).toContain(en.title);
      expect(panel.find(".govuk-panel__body").text()).toContain(en.uploadedMessage);
      expect($("h2").text()).toContain(en.nextStepsHeading);
      expect($('a[href="/manual-upload"]').text()).toContain(en.uploadAnotherLink);
      expect($('a[href="/remove-list-search"]').text()).toContain(en.removeFileLink);
      expect($('a[href="/admin-dashboard"]').text()).toContain(en.homeLink);
    });

    it("should render the success panel and navigation links in Welsh", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("title").text()).toContain(cy.pageTitle);
      expect($(".govuk-panel__title").text()).toContain(cy.title);
      expect($(".govuk-panel__body").text()).toContain(cy.uploadedMessage);
      expect($("h2").text()).toContain(cy.nextStepsHeading);
      expect($('a[href="/manual-upload"]').text()).toContain(cy.uploadAnotherLink);
      expect($('a[href="/remove-list-search"]').text()).toContain(cy.removeFileLink);
      expect($('a[href="/admin-dashboard"]').text()).toContain(cy.homeLink);
    });

    it("should not render an error summary", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Content standards", () => {
    it("should have page titles following the GOV.UK title convention", () => {
      expect(en.pageTitle.endsWith("GOV.UK")).toBe(true);
      expect(cy.pageTitle.endsWith("GOV.UK")).toBe(true);
      expect(en.pageTitle).toContain("Court and tribunal hearings");
      expect(cy.pageTitle).toContain("Gwrandawiadau llys a thribiwnlys");
      expect(en.pageTitle).toContain("Manual upload");
      expect(cy.pageTitle).toContain("Uwchlwytho â llaw");
    });

    it("should have action-oriented, non-generic link text", () => {
      expect(en.uploadAnotherLink).toMatch(/upload/i);
      expect(en.removeFileLink).toMatch(/remove/i);
      expect(en.homeLink).toMatch(/home/i);
      expect(en.uploadAnotherLink).not.toBe("Click here");
      expect(en.removeFileLink).not.toBe("Click here");
      expect(en.homeLink).not.toBe("Click here");
    });

    it("should have positive success messaging", () => {
      expect(en.title.toLowerCase()).toContain("successful");
      expect(en.uploadedMessage).toContain("uploaded");
      expect(cy.title).toContain("llwyddo");
      expect(cy.uploadedMessage).toContain("huwchlwytho");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["pageTitle", "title", "uploadedMessage", "nextStepsHeading", "uploadAnotherLink", "removeFileLink", "homeLink"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
