import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-court-publications/index.njk";

const buildData = (content: typeof en | typeof cy) => ({
  ...content,
  locationName: "Test Court",
  locationType: "Court",
  jurisdiction: "Civil",
  region: "London"
});

describe("delete-court-publications template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should render the page heading and summary details", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    expect($("h1").text()).toContain(en.pageTitle);
    const values = $(".govuk-summary-list__value")
      .map((_, el) => $(el).text().trim())
      .get();
    expect(values).toContain("Test Court");
    assertNoErrors($);
  });

  it("should render the radio options and continue button", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    const radioValues = $("input[name='confirmDelete']")
      .map((_, el) => $(el).attr("value"))
      .get();
    expect(radioValues).toEqual(["yes", "no"]);
    expect($(".govuk-button").text()).toContain(en.continueButtonText);
  });

  it("should render the error summary when a validation error is present", () => {
    const data = { ...buildData(en), errors: [{ text: en.noRadioSelected, href: "#confirm-delete" }] };

    const { $ } = render(env, TEMPLATE, data);

    assertErrorSummary($, [en.noRadioSelected]);
  });

  it("should render the Welsh page heading", () => {
    const { $ } = render(env, TEMPLATE, buildData(cy));

    expect($("h1").text()).toContain(cy.pageTitle);
  });

  it("should have matching English and Welsh keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    expect(Object.keys(en.tableHeadings).sort()).toEqual(Object.keys(cy.tableHeadings).sort());
  });
});
