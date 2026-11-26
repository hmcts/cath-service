import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(system-admin)/migration-connection-check/index.njk";
const HOSTS = ["pip-data-management.staging.platform.hmcts.net", "pip-account-management.staging.platform.hmcts.net"];
const HOST_PATTERNS = ["pip-data-management.<environment>.platform.hmcts.net", "pip-account-management.<environment>.platform.hmcts.net"];

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

function buildResult(overrides = {}) {
  return {
    isSuccess: true,
    title: en.result.succeededTitle,
    rows: [
      { key: en.result.urlTested, value: `https://${HOSTS[0]}/locations/111` },
      { key: en.result.outcome, value: en.outcomes.connected },
      { key: en.result.httpStatus, value: "200" }
    ],
    ...overrides
  };
}

function renderPage(overrides = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    ...locale,
    lngParam: locale === cy ? "?lng=cy" : "",
    isConfigured: true,
    allowedHosts: HOST_PATTERNS,
    data: { url: "" },
    ...overrides
  });
}

describe("migration-connection-check template", () => {
  it("should render the heading, URL input and button", () => {
    const { $ } = renderPage();

    expect($("h1").text()).toContain(en.pageTitle);
    expect($('input#url[name="url"][type="text"][inputmode="url"]')).toHaveLength(1);
    expect($('label[for="url"]').text()).toContain(en.urlLabel);
    expect($("form[method='post'] button").text()).toContain(en.testConnectionButton);
    assertNoErrors($);
  });

  it("should show https:// as a fixed prefix so the scheme is never submitted", () => {
    const { $ } = renderPage();

    expect($(".govuk-input__prefix").text().trim()).toBe("https://");
  });

  it("should list every PIP API host pattern in the hint", () => {
    const { $ } = renderPage();

    const hosts = $("#allowed-hosts li");
    expect(hosts).toHaveLength(2);
    expect(hosts.eq(0).text()).toBe(HOST_PATTERNS[0]);
    expect(hosts.eq(1).text()).toBe(HOST_PATTERNS[1]);
    expect($("#url-hint").text()).toContain(en.authHint);
  });

  it("should keep the entered URL in the input", () => {
    const { $ } = renderPage({ data: { url: "example.com/x" } });

    expect($("input#url").val()).toBe("example.com/x");
  });

  it("should render a back link to the migration page", () => {
    const { $ } = renderPage();

    expect($('a.govuk-back-link[href="/migration"]').text()).toBe(en.back);
  });

  it("should show the error summary and inline error when there is a validation error", () => {
    const { $ } = renderPage({ errors: [{ text: en.errorMessages.hostNotAllowed, href: "#url" }] });

    assertErrorSummary($, [en.errorMessages.hostNotAllowed]);
    expect($("#url-error").text()).toContain(en.errorMessages.hostNotAllowed);
    expect($("input#url").hasClass("govuk-input--error")).toBe(true);
  });

  it("should not show a result block when no test has run", () => {
    const { $ } = renderPage();

    expect($(".connection-result")).toHaveLength(0);
  });

  it("should show a success result with a summary list row per item", () => {
    const { $ } = renderPage({ connectionResult: buildResult() });

    const result = $(".connection-result");
    expect(result.hasClass("connection-result--success")).toBe(true);
    expect(result.attr("role")).toBe("alert");
    expect(result.find(".connection-result__title").text()).toBe(en.result.succeededTitle);
    const rows = result.find(".govuk-summary-list__row");
    expect(rows).toHaveLength(3);
    expect(rows.eq(1).find(".govuk-summary-list__key").text().trim()).toBe(en.result.outcome);
    expect(rows.eq(1).find(".govuk-summary-list__value").text().trim()).toBe(en.outcomes.connected);
  });

  it("should show a failed result with the fail modifier", () => {
    const { $ } = renderPage({ connectionResult: buildResult({ isSuccess: false, title: en.result.failedTitle }) });

    expect($(".connection-result").hasClass("connection-result--fail")).toBe(true);
    expect($(".connection-result--success")).toHaveLength(0);
    expect($(".connection-result__title").text()).toBe(en.result.failedTitle);
  });

  it("should show the not set up message instead of the form when not configured", () => {
    const { $ } = renderPage({ isConfigured: false });

    expect($(".govuk-inset-text").text()).toContain(en.notConfigured);
    expect($("form")).toHaveLength(0);
    expect($("input#url")).toHaveLength(0);
  });

  it("should not show the not set up message when configured", () => {
    const { $ } = renderPage();

    expect($(".govuk-inset-text")).toHaveLength(0);
  });

  it("should render Welsh content", () => {
    const { $ } = renderPage({}, cy);

    expect($("h1").text()).toContain(cy.pageTitle);
    expect($("form button").text()).toContain(cy.testConnectionButton);
    expect($('a.govuk-back-link[href="/migration?lng=cy"]').text()).toBe(cy.back);
  });

  it("should have the same content keys in English and Welsh", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    for (const key of ["errorMessages", "result", "outcomes", "tokenReasons"] as const) {
      expect(Object.keys(en[key]).sort()).toEqual(Object.keys(cy[key]).sort());
    }
  });
});
