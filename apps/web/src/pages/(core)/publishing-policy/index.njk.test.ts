import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { publishingPolicyCy as cy, publishingPolicyEn as en } from "@hmcts/web-core";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(core)/publishing-policy/index.njk";

describe("publishing-policy template", () => {
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
    it("should render the English heading and section headings", () => {
      const data = { ...en, en, cy, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      const headingText = $("h2, h3")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headingText).toContain(en.section1.heading);
      expect(headingText).toContain(en.section4.section41.heading);
      expect(headingText).toContain(en.section10.heading);
    });

    it("should render the English section body content and lists", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const bodyText = $("body").text();
      expect(bodyText).toContain(en.section1.text2);
      expect(bodyText).toContain(en.section2.text1);
      expect(bodyText).toContain(en.section3.section31.text);
      expect(bodyText).toContain(en.section4.section43.quote);

      const bulletText = $("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const item of en.section2.list1) {
        expect(bulletText).toContain(item);
      }
    });

    it("should render the quote wrapping link text with surrounding quotation marks", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const paragraph = $(`a[href="${en.section4.section41.link.href}"]`).parent().text();
      expect(paragraph).toContain(`"${en.section4.section41.link.text}"`);
    });

    it("should render the linked list entries in section 6.1", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      for (const entry of en.section6.section61.linkedList) {
        expect($(`a[href="${entry.link.href}"]`).text()).toContain(entry.link.text);
      }
    });

    it("should render the address block", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const bodyText = $("body").text();
      for (const line of en.section10.address) {
        expect(bodyText).toContain(line);
      }
    });

    it("should render the back to top link", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.back-to-top-link a").text()).toContain(en.backToTop);
    });

    it("should render Welsh heading and content", () => {
      const data = { ...cy, en, cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("p.back-to-top-link a").text()).toContain(cy.backToTop);
      const bodyText = $("body").text();
      expect(bodyText).toContain(cy.section1.text2);
      expect(bodyText).toContain(cy.section4.section43.quote);
    });

    it("should render the Welsh quote wrapping link text with surrounding quotation marks", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      const paragraph = $(`a[href="${cy.section4.section41.link.href}"]`).parent().text();
      expect(paragraph).toContain(`"${cy.section4.section41.link.text}"`);
    });
  });

  describe("Locale consistency", () => {
    it("should have same top-level section keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same section4 sub-keys in English and Welsh", () => {
      expect(Object.keys(en.section4).sort()).toEqual(Object.keys(cy.section4).sort());
    });

    it("should have the same number of address lines", () => {
      expect(en.section10.address).toHaveLength(cy.section10.address.length);
    });
  });
});
