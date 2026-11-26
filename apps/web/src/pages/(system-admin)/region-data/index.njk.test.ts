import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/region-data/index.njk";

function buildData(content: typeof en | typeof cy, overrides: Record<string, unknown> = {}) {
  return {
    ...content,
    radioItems: content.options.map((option) => ({ value: option.value, text: option.label })),
    radioError: undefined,
    errors: undefined,
    ...overrides
  };
}

function buildErrorData(content: typeof en | typeof cy) {
  return buildData(content, {
    radioError: { text: content.noSelectionError },
    errors: [{ text: content.noSelectionError, href: "#action" }]
  });
}

describe("region-data index template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should render the page heading once, inside the fieldset legend", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    expect($("h1")).toHaveLength(1);
    expect($("fieldset > legend.govuk-fieldset__legend--l > h1.govuk-fieldset__heading")).toHaveLength(1);
    expect($("h1").text().trim()).toBe(en.title);
  });

  it("should not render a visually hidden legend", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    expect($("legend")).toHaveLength(1);
    expect($("legend.govuk-visually-hidden")).toHaveLength(0);
  });

  it("should wrap every radio in the fieldset", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    expect($("input[type=radio]")).toHaveLength(en.options.length);
    expect($("fieldset input[type=radio]")).toHaveLength(en.options.length);
  });

  it("should not render an error summary when there are no errors", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    assertNoErrors($);
  });

  it("should keep the error summary above the form and the error message linked to the fieldset", () => {
    const { $ } = render(env, TEMPLATE, buildErrorData(en));

    assertErrorSummary($, [en.noSelectionError]);
    expect($(".govuk-error-summary").nextAll("form")).toHaveLength(1);
    expect($(".govuk-error-summary__list a").attr("href")).toBe("#action");
    expect($("input#action")).toHaveLength(1);
    expect($("#action-error").text()).toContain(en.noSelectionError);
    expect($("fieldset").attr("aria-describedby")).toContain("action-error");
    expect($("h1")).toHaveLength(1);
  });

  it("should render the Welsh heading inside the legend", () => {
    const { $ } = render(env, TEMPLATE, buildErrorData(cy));

    expect($("legend h1").text().trim()).toBe(cy.title);
    assertErrorSummary($, [cy.noSelectionError]);
  });

  it("should have matching keys in English and Welsh", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
