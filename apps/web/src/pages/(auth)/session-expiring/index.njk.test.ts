import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(auth)/session-expiring/index.njk";

function renderPage(t: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, {
    en,
    cy,
    t,
    pageTitle: t.pageTitle,
    back: t.backButton,
    continueHref: "/summary-of-publications?locationId=9",
    redirectType: "SSO",
    warningLeadMs: 1200000,
    isAuthenticated: true,
    sessionIdleMs: 2400000,
    isSessionExpiringPage: true,
    ...overrides
  });
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

describe("session-expiring template", () => {
  it("should render a single heading with the header text", () => {
    const { $ } = renderPage();

    expect($("h1")).toHaveLength(1);
    expect($("h1.govuk-heading-l").text().trim()).toBe(en.header);
  });

  it("should render the continue message as body text", () => {
    const { $ } = renderPage();

    expect($("main p.govuk-body").first().text().trim()).toBe(en.continueMessage);
  });

  it("should render Continue as a button link to the continue path", () => {
    const { $ } = renderPage();

    const button = $("main a.govuk-button");
    expect(button).toHaveLength(1);
    expect(button.text().trim()).toBe(en.continue);
    expect(button.attr("href")).toBe("/summary-of-publications?locationId=9");
  });

  it("should render the back link", () => {
    const { $ } = renderPage();

    expect($(".govuk-back-link")).toHaveLength(1);
    expect($(".govuk-back-link").text().trim()).toBe(en.backButton);
  });

  it("should render the hidden marker for the bundled script", () => {
    const { $ } = renderPage();

    const marker = $("#session-expiring");
    expect(marker).toHaveLength(1);
    expect(marker.attr("hidden")).toBeDefined();
    expect(marker.attr("data-warning-lead-ms")).toBe("1200000");
    expect(marker.attr("data-redirect-type")).toBe("SSO");
  });

  it("should not set the idle duration on body", () => {
    const { $ } = renderPage();

    expect($("body").attr("data-session-idle-ms")).toBeUndefined();
  });

  it("should not render an inline script for the timeout", () => {
    const { $ } = renderPage();

    const inlineScripts = $("script:not([src])")
      .toArray()
      .map((el) => $(el).html() ?? "");
    expect(inlineScripts.some((script) => script.includes("idleExpiry"))).toBe(false);
  });

  it("should set the page title", () => {
    const { $ } = renderPage();

    expect($("title").text()).toContain(en.pageTitle);
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = renderPage(cy);

    expect($("h1").text().trim()).toBe(cy.header);
    expect($("main p.govuk-body").first().text().trim()).toBe(cy.continueMessage);
    expect($("main a.govuk-button").text().trim()).toBe(cy.continue);
    expect($(".govuk-back-link").text().trim()).toBe(cy.backButton);
    expect($("title").text()).toContain(cy.pageTitle);
  });

  it("should have matching English and Welsh keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
