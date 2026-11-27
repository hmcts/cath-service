import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/account-home/index.njk";

describe("account-home template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(en.title);
    });

    it("should render the three tiles with headings and descriptions", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      const tileHeadings = $(".verified-tile-heading")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tileHeadings).toEqual([en.sections.courtHearings.title, en.sections.sjpCases.title, en.sections.emailSubscriptions.title]);

      const body = $("body").text();
      expect(body).toContain(en.sections.courtHearings.description);
      expect(body).toContain(en.sections.sjpCases.description);
      expect(body).toContain(en.sections.emailSubscriptions.description);
    });

    it("should link each tile to the correct destination", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      expect($('a[href="/search"]')).toHaveLength(1);
      expect($('a[href="/summary-of-publications?locationId=9"]')).toHaveLength(1);
      expect($('a[href="/subscription-management"]')).toHaveLength(1);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and tile headings", () => {
      const data = { title: cy.title, sections: cy.sections };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(cy.title);
      const tileHeadings = $(".verified-tile-heading")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tileHeadings).toEqual([cy.sections.courtHearings.title, cy.sections.sjpCases.title, cy.sections.emailSubscriptions.title]);
    });
  });

  describe("verified banner", () => {
    it("should show the verified notification banner when showVerifiedBanner is true", () => {
      const { $ } = render(env, TEMPLATE, { ...en, showVerifiedBanner: true });

      const banner = $(".govuk-notification-banner");
      expect(banner).toHaveLength(1);
      expect(banner.find(".govuk-notification-banner__title").text().trim()).toBe(en.bannerTitle);
      expect(banner.find("p.govuk-notification-banner__heading").text().trim()).toBe(en.bannerText);
    });

    it("should render the banner before the page heading", () => {
      const { $ } = render(env, TEMPLATE, { ...en, showVerifiedBanner: true });

      const column = $(".govuk-grid-column-full").first();
      expect(column.children().first().hasClass("govuk-notification-banner")).toBe(true);
      expect(column.find(".govuk-notification-banner ~ h1")).toHaveLength(1);
    });

    it.each([false, undefined])("should not show the banner when showVerifiedBanner is %s", (showVerifiedBanner) => {
      const { $ } = render(env, TEMPLATE, { ...en, showVerifiedBanner });

      expect($(".govuk-notification-banner")).toHaveLength(0);
    });

    it("should show the Welsh banner title and text when the cy locale is used", () => {
      const { $ } = render(env, TEMPLATE, { ...cy, showVerifiedBanner: true });

      expect($(".govuk-notification-banner__title").text().trim()).toBe(cy.bannerTitle);
      expect($("p.govuk-notification-banner__heading").text().trim()).toBe(cy.bannerText);
      expect($("body").text()).not.toContain(en.bannerTitle);
    });
  });

  it("should have the same locale keys in en and cy", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    expect(en.bannerText).toBe("Your account has been verified.");
    expect(cy.bannerText).toBe("Mae eich cyfrif wedi cael ei ddilysu.");
  });
});
