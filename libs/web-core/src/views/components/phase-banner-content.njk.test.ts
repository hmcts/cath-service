import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../../locales/cy.js";
import { en } from "../../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "components/phase-banner-content.njk";

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.resolve(__dirname, "..")]);
});

function renderBanner(locale: typeof en | typeof cy, overrides: Record<string, unknown> = {}) {
  const otherLocale = locale === en ? "cy" : "en";
  return render(env, TEMPLATE, {
    ...locale,
    otherLocale,
    pageUrl: "courts-tribunals-list",
    languageToggle: { link: `?lng=${otherLocale}`, text: locale.language.switch },
    ...overrides
  });
}

describe("phase-banner-content template", () => {
  describe("language toggle", () => {
    it("should render the Cymraeg link with lang=cy and no aria-label on English pages", () => {
      const { $ } = renderBanner(en);
      const toggle = $("a.app-phase-banner__language");

      expect(toggle).toHaveLength(1);
      expect(toggle.text().trim()).toBe("Cymraeg");
      expect(toggle.attr("lang")).toBe("cy");
      expect(toggle.attr("href")).toBe("?lng=cy");
      expect(toggle.attr("aria-label")).toBeUndefined();
    });

    it("should render the English link with lang=en and no aria-label on Welsh pages", () => {
      const { $ } = renderBanner(cy);
      const toggle = $("a.app-phase-banner__language");

      expect(toggle.text().trim()).toBe("English");
      expect(toggle.attr("lang")).toBe("en");
      expect(toggle.attr("aria-label")).toBeUndefined();
    });

    it("should not render the toggle when no language toggle is set, as for admins", () => {
      const { $ } = renderBanner(en, { languageToggle: undefined });

      expect($("a.app-phase-banner__language")).toHaveLength(0);
    });
  });

  describe("feedback link", () => {
    it("should include the new tab warning in the link text", () => {
      const { $ } = renderBanner(en);
      const link = $(".app-phase-banner__feedback a");

      expect(link).toHaveLength(1);
      expect(link.text().trim()).toBe("feedback (opens in a new tab)");
      expect(link.attr("aria-label")).toBeUndefined();
      expect($(".app-phase-banner__feedback").text().trim()).toBe("This is a new service – your feedback (opens in a new tab) will help us to improve it.");
    });

    it("should open in a new tab safely and point at the survey with the page url", () => {
      const { $ } = renderBanner(en);
      const link = $(".app-phase-banner__feedback a");

      expect(link.attr("target")).toBe("_blank");
      expect(link.attr("rel")).toContain("noopener");
      expect(link.attr("href")).toBe(`${en.feedback.link}courts-tribunals-list`);
    });

    it("should render the Welsh feedback text and new tab warning", () => {
      const { $ } = renderBanner(cy);
      const link = $(".app-phase-banner__feedback a");

      expect(link.text().trim()).toBe(`${cy.feedback.part2} ${cy.feedback.newTab}`);
      expect(link.attr("aria-label")).toBeUndefined();
    });

    it("should still render the feedback link when there is no language toggle", () => {
      const { $ } = renderBanner(en, { languageToggle: undefined });

      expect($(".app-phase-banner__feedback a")).toHaveLength(1);
    });
  });
});
