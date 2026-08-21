import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/mi-report/index.njk";

function baseData(t: typeof en | typeof cy) {
  return {
    ...t,
    periodItems: t.periodOptions.map((option) => ({ value: option.value, text: option.text })),
    reportTypeItems: t.reportTypeOptions.map((option) => ({ value: option.value, text: option.text }))
  };
}

describe("mi-report template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should render the heading and both select dropdowns with all options", () => {
    const { $ } = render(env, TEMPLATE, baseData(en));

    expect($("h1").text()).toContain(en.title);
    expect($('select[name="period"] option')).toHaveLength(en.periodOptions.length);
    expect($('select[name="reportType"] option')).toHaveLength(en.reportTypeOptions.length);
    expect($('select[name="period"] option[value="all"]')).toHaveLength(1);
    expect($('select[name="reportType"] option[value="all-data"]')).toHaveLength(1);
  });

  it("should not render an error summary in the default state", () => {
    const { $ } = render(env, TEMPLATE, baseData(en));

    assertNoErrors($);
  });

  it("should render the error summary with both messages when validation fails", () => {
    const { $ } = render(env, TEMPLATE, {
      ...baseData(en),
      errors: [
        { text: en.periodError, href: "#period" },
        { text: en.reportTypeError, href: "#reportType" }
      ]
    });

    assertErrorSummary($, [en.periodError, en.reportTypeError]);
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, baseData(cy));

    expect($("h1").text()).toContain(cy.title);
    expect($('select[name="period"] option')).toHaveLength(cy.periodOptions.length);
  });

  it("should have identical keys in the English and Welsh content", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
