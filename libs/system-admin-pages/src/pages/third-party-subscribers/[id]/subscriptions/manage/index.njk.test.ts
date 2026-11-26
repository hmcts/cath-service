import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "index.njk";
const SAVE_BUTTON = "button[name=action][value=save]";
const NEXT_BUTTON = "button[name=action][value=next]";

function buildListType(overrides = {}) {
  return { id: 1, name: "CIVIL_DAILY_CAUSE_LIST", friendlyName: "Civil Daily Cause List", welshFriendlyName: "Rhestr Achosion Dyddiol Sifil", ...overrides };
}

function baseData(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  const currentPage = (overrides.currentPage as number | undefined) ?? 1;
  const totalPages = (overrides.totalPages as number | undefined) ?? 2;
  return {
    ...locale,
    en,
    cy,
    locale: locale === cy ? "cy" : "en",
    lngParam: locale === cy ? "?lng=cy" : "",
    userId: "00000000-0000-0000-0000-000000000001",
    userName: "Test Corp",
    useDropdown: true,
    listTypes: [buildListType()],
    currentSubscriptions: {},
    currentPage,
    totalPages,
    isLastPage: currentPage >= totalPages,
    pageOf: locale.pageOf(currentPage, totalPages),
    ...overrides
  };
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../../web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("manage third-party subscriptions template", () => {
  it("should render Save and a secondary Next inside a button group on a page that is not the last", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, { currentPage: 1, totalPages: 3 }));

    const group = $("form .govuk-button-group");
    expect(group).toHaveLength(1);
    expect(group.find(SAVE_BUTTON)).toHaveLength(1);
    expect(group.find(SAVE_BUTTON).text().trim()).toBe(en.saveButton);
    expect(group.find(SAVE_BUTTON).hasClass("govuk-button--secondary")).toBe(false);
    expect(group.find(NEXT_BUTTON)).toHaveLength(1);
    expect(group.find(NEXT_BUTTON).text().trim()).toBe(en.nextButton);
    expect(group.find(NEXT_BUTTON).hasClass("govuk-button--secondary")).toBe(true);
  });

  it("should render Save before Next so Enter submits the save action", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, { currentPage: 2, totalPages: 3 }));

    const values = $("form button[name=action]")
      .map((_, el) => $(el).attr("value"))
      .get();
    expect(values).toEqual(["save", "next"]);
  });

  it("should render Save without Next on the last page", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, { currentPage: 3, totalPages: 3 }));

    expect($(SAVE_BUTTON)).toHaveLength(1);
    expect($(NEXT_BUTTON)).toHaveLength(0);
  });

  it("should render Save without Next when there is only one page", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, { currentPage: 1, totalPages: 1 }));

    expect($(SAVE_BUTTON)).toHaveLength(1);
    expect($(NEXT_BUTTON)).toHaveLength(0);
  });

  it("should render the page position text", () => {
    const { $ } = render(env, TEMPLATE, baseData(en, { currentPage: 2, totalPages: 3 }));

    expect($("p.govuk-body").first().text().trim()).toBe("Page 2 of 3");
  });

  it("should render Welsh button text when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, baseData(cy, { currentPage: 1, totalPages: 2 }));

    expect($(SAVE_BUTTON).text().trim()).toBe(cy.saveButton);
    expect($(NEXT_BUTTON).text().trim()).toBe(cy.nextButton);
    expect($("h1").text().trim()).toBe(cy.pageTitle);
  });

  it.each([true, false])("should render both buttons when useDropdown is %s", (useDropdown) => {
    const { $ } = render(env, TEMPLATE, baseData(en, { useDropdown, currentPage: 1, totalPages: 2 }));

    expect($(useDropdown ? "select.govuk-select" : "input.govuk-radios__input")).not.toHaveLength(0);
    expect($(".govuk-button-group").find(SAVE_BUTTON)).toHaveLength(1);
    expect($(".govuk-button-group").find(NEXT_BUTTON)).toHaveLength(1);
  });

  it("should have matching keys in the English and Welsh content", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(cy.tableHeadings).sort()).toEqual(Object.keys(en.tableHeadings).sort());
    expect(Object.keys(cy.sensitivityOptions).sort()).toEqual(Object.keys(en.sensitivityOptions).sort());
  });
});
