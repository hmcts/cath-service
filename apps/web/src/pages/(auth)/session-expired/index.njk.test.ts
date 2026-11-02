import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(auth)/session-expired/index.njk";

function renderPage(t: typeof en | typeof cy = en, signInUrl = "/cft-login") {
  return render(env, TEMPLATE, { en, cy, t, pageTitle: t.pageTitle, signInUrl });
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

describe("session-expired template", () => {
  it("should render a single heading with the header text", () => {
    const { $ } = renderPage();

    expect($("h1")).toHaveLength(1);
    expect($("h1.govuk-heading-l").text().trim()).toBe(en.header);
  });

  it("should not render a confirmation panel", () => {
    const { $ } = renderPage();

    expect($(".govuk-panel")).toHaveLength(0);
  });

  it("should not render a back link", () => {
    const { $ } = renderPage();

    expect($(".govuk-back-link")).toHaveLength(0);
  });

  it("should render the detail and sign in message as two body paragraphs", () => {
    const { $ } = renderPage();

    const paragraphs = $("main p.govuk-body");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs.eq(0).text().trim()).toBe(en.detail);
    expect(paragraphs.eq(1).text().trim()).toBe(en.signInMessage);
  });

  it.each(["/cft-login", "/crime-login", "/b2c-login", "/login"])("should render Sign in as a button linking to %s", (signInUrl) => {
    const { $ } = renderPage(en, signInUrl);

    const button = $("main a.govuk-button");
    expect(button).toHaveLength(1);
    expect(button.text().trim()).toBe(en.signIn);
    expect(button.attr("href")).toBe(signInUrl);
  });

  it("should set the page title", () => {
    const { $ } = renderPage();

    expect($("title").text()).toContain(en.pageTitle);
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = renderPage(cy);

    expect($("h1").text().trim()).toBe(cy.header);
    expect($("main p.govuk-body").eq(0).text().trim()).toBe(cy.detail);
    expect($("main p.govuk-body").eq(1).text().trim()).toBe(cy.signInMessage);
    expect($("main a.govuk-button").text().trim()).toBe(cy.signIn);
    expect($("title").text()).toContain(cy.pageTitle);
  });

  it("should have matching English and Welsh keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
