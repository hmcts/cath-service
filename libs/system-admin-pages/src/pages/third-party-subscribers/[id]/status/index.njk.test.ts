import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "index.njk";
const USER_ID = "00000000-0000-0000-0000-000000000001";
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;

function buildData(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return {
    ...locale,
    en,
    cy,
    lngParam: "",
    userId: USER_ID,
    selectedStatus: "PENDING",
    statusItems: STATUSES.map((value) => ({ value, text: locale.statusLabels[value] })),
    ...overrides
  };
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("third-party-subscribers status template", () => {
  it("should render the page heading and title", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("h1").text().trim()).toBe("Manage subscriber status");
    expect($("title").text()).toContain("Manage subscriber status");
  });

  it("should render three status radios named status with the legend", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const radios = $('input[type="radio"][name="status"]');
    expect(radios).toHaveLength(3);
    expect(radios.map((_, el) => $(el).attr("value")).get()).toEqual(["PENDING", "ACTIVE", "SUSPENDED"]);
    expect(
      $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get()
    ).toEqual(["Pending", "Active", "Suspended"]);
    expect($(".govuk-fieldset__legend--m").text().trim()).toBe("Status");
  });

  it("should give the first radio the id the error summary links to", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("input#status").attr("value")).toBe("PENDING");
  });

  it.each(STATUSES)("should pre-select only the current status when it is %s", (status) => {
    const { $ } = render(env, TEMPLATE, buildData({ selectedStatus: status }));

    const checked = $('input[name="status"]:checked');
    expect(checked).toHaveLength(1);
    expect(checked.attr("value")).toBe(status);
  });

  it("should not render a select", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("select")).toHaveLength(0);
  });

  it("should render a post form with the Confirm button", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const form = $("form");
    expect(form.attr("method")).toBe("post");
    expect(form.attr("novalidate")).toBeDefined();
    expect(form.find("button.govuk-button").text().trim()).toBe("Confirm");
  });

  it("should render Cancel as a secondary link button to the Manage page", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const cancel = $("a.govuk-button--secondary");
    expect(cancel).toHaveLength(1);
    expect(cancel.text().trim()).toBe("Cancel");
    expect(cancel.attr("href")).toBe(`/third-party-subscribers/${USER_ID}/manage`);
  });

  it("should render the back link to the Manage page", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const backLink = $("a.govuk-back-link");
    expect(backLink).toHaveLength(1);
    expect(backLink.text().trim()).toBe("Back");
    expect(backLink.attr("href")).toBe(`/third-party-subscribers/${USER_ID}/manage`);
  });

  it("should carry the Welsh language param on the Cancel and back links", () => {
    const { $ } = render(env, TEMPLATE, buildData({ lngParam: "?lng=cy" }, cy));

    expect($("a.govuk-button--secondary").attr("href")).toBe(`/third-party-subscribers/${USER_ID}/manage?lng=cy`);
    expect($("a.govuk-back-link").attr("href")).toBe(`/third-party-subscribers/${USER_ID}/manage?lng=cy`);
  });

  it("should not render an error summary or inline error when there are no errors", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    assertNoErrors($);
    expect($(".govuk-error-message")).toHaveLength(0);
    expect($(".govuk-form-group--error")).toHaveLength(0);
  });

  it("should render the error summary and inline error when the status is invalid", () => {
    const { $ } = render(env, TEMPLATE, buildData({ errors: [{ text: en.statusRequired, href: "#status" }] }));

    assertErrorSummary($, ["Select a status"]);
    expect($(".govuk-error-summary__title").text().trim()).toBe("There is a problem");
    expect($(".govuk-error-summary__list a").attr("href")).toBe("#status");
    expect($(".govuk-error-message").text()).toContain("Select a status");
    expect($(".govuk-form-group--error")).toHaveLength(1);
    expect($('input[name="status"]:checked').attr("value")).toBe("PENDING");
  });

  it("should prefix the page title with Error when there are errors", () => {
    const { $ } = render(env, TEMPLATE, buildData({ errors: [{ text: en.statusRequired, href: "#status" }] }));

    expect($("title").text().replace(/\s+/g, " ").trim()).toMatch(/^Error: Manage subscriber status/);
  });

  it("should not prefix the page title when there are no errors", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("title").text().replace(/\s+/g, " ").trim()).toMatch(/^Manage subscriber status/);
  });

  it("should render the error summary before the heading", () => {
    const { $ } = render(env, TEMPLATE, buildData({ errors: [{ text: en.statusRequired, href: "#status" }] }));

    const column = $(".govuk-grid-column-two-thirds").children();
    expect(column.index($(".govuk-error-summary"))).toBeLessThan(column.index($("h1")));
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, buildData({ lngParam: "?lng=cy" }, cy));

    expect($("h1").text().trim()).toBe("Rheoli statws tanysgrifwr");
    expect($(".govuk-fieldset__legend--m").text().trim()).toBe("Statws");
    expect(
      $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get()
    ).toEqual(["Yn yr arfaeth", "Gweithredol", "Wedi'i atal"]);
    expect($("form button.govuk-button").text().trim()).toBe("Cadarnhau");
    expect($("a.govuk-button--secondary").text().trim()).toBe("Canslo");
    expect($("a.govuk-back-link").text().trim()).toBe("Yn ôl");
  });

  it("should render the Welsh error summary and inline error", () => {
    const { $ } = render(env, TEMPLATE, buildData({ errors: [{ text: cy.statusRequired, href: "#status" }] }, cy));

    assertErrorSummary($, ["Dewiswch statws"]);
    expect($(".govuk-error-summary__title").text().trim()).toBe("Mae problem wedi codi");
    expect($(".govuk-error-message").text()).toContain("Dewiswch statws");
    expect($("title").text().replace(/\s+/g, " ").trim()).toMatch(/^Gwall: Rheoli statws tanysgrifwr/);
  });
});

describe("third-party-subscribers status content", () => {
  it("should have the same keys in English and Welsh", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(cy.statusLabels).sort()).toEqual(Object.keys(en.statusLabels).sort());
  });

  it("should have a label for every status", () => {
    expect(Object.keys(en.statusLabels).sort()).toEqual([...STATUSES].sort());
  });
});
