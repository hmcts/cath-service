import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-court-subscriptions-success/index.njk";

function baseData(content: typeof en | typeof cy, locale: "en" | "cy", locationName: string) {
  return { ...content, locationName, locale };
}

describe("delete-court-subscriptions-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should exist", () => {
    expect(existsSync(path.join(__dirname, "index.njk"))).toBe(true);
  });

  it("should have matching en and cy keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });

  it("should render the success panel with the banner text", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, "en", "Test Court"));

    expect($(".govuk-panel")).toHaveLength(1);
    expect($(".govuk-panel__title").text().trim()).toBe(en.pageTitle);
    expect($(".govuk-panel__body").text().trim()).toBe(en.bannerText);
    expect($("h2.govuk-heading-m").text()).toBe(en.nextStepsTitle);
  });

  it("should render the continue-deletion link with the court name to the confirm page", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, "en", "Test Court"));

    const continueLink = $('a[href="/delete-court-confirm"]');
    expect(continueLink).toHaveLength(1);
    expect(continueLink.text().trim()).toBe(`${en.continueDeleteCourtLink} Test Court`);
  });

  it("should render the upload and home links", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, "en", "Test Court"));

    expect($('a[href="/reference-data-upload"]').text()).toBe(en.uploadReferenceDataLink);
    expect($('a[href="/system-admin-dashboard"]').text()).toBe(en.homeLink);
    expect($(".govuk-list a")).toHaveLength(3);
  });

  it("should render Welsh content and append lng=cy to every link", () => {
    const { $ } = render(env, TEMPLATE, baseData(cy, "cy", "Llys Prawf"));

    expect($(".govuk-panel__body").text().trim()).toBe(cy.bannerText);
    expect($('a[href="/delete-court-confirm?lng=cy"]').text().trim()).toBe(`${cy.continueDeleteCourtLink} Llys Prawf`);
    expect($('a[href="/reference-data-upload?lng=cy"]')).toHaveLength(1);
    expect($('a[href="/system-admin-dashboard?lng=cy"]')).toHaveLength(1);
  });
});
