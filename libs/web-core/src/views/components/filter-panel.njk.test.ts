import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../../locales/cy.js";
import { en } from "../../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MACRO_CALLER = '{% from "components/filter-panel.njk" import appFilter %}{{ appFilter(params) }}';

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.resolve(__dirname, "..")]);
});

function buildParams(overrides: Record<string, unknown> = {}) {
  return {
    heading: { text: "Filter" },
    hint: { text: en.filterPanel.hint },
    submit: { text: "Apply filters" },
    optionsHtml:
      '<div class="govuk-checkboxes"><input type="checkbox" id="opt-1" name="opt" value="1"><input type="checkbox" id="opt-2" name="opt" value="2"></div>',
    attributes: { "data-show-text": "Show filters", "data-start-hidden": "false" },
    ...overrides
  };
}

function renderFilter(params: Record<string, unknown>) {
  const html = env.renderString(MACRO_CALLER, { params });
  return render(env, "components/filter-panel.njk", {}).$.load(html);
}

describe("appFilter macro", () => {
  it("should render the hint first and the apply button last in the options", () => {
    const $ = renderFilter(buildParams());
    const children = $(".moj-filter__options").children();

    expect(children.first().is("p.govuk-hint#filter-hint")).toBe(true);
    expect(children.last().is("button.govuk-button.app-filter__apply")).toBe(true);
    expect($(".moj-filter__options button.govuk-button")).toHaveLength(1);
  });

  it("should place the apply button after every filter option in DOM order", () => {
    const $ = renderFilter(buildParams());
    const focusable = $(".moj-filter__options").find("input, button").toArray();

    expect(focusable.map((el) => $(el).attr("id") ?? $(el).text().trim())).toEqual(["opt-1", "opt-2", "Apply filters"]);
  });

  it("should describe the apply button with the hint", () => {
    const $ = renderFilter(buildParams());

    expect($("#filter-hint").text().trim()).toBe(en.filterPanel.hint);
    expect($("button.app-filter__apply").attr("aria-describedby")).toBe("filter-hint");
  });

  it("should render the Welsh hint", () => {
    const $ = renderFilter(buildParams({ hint: { text: cy.filterPanel.hint } }));

    expect($("#filter-hint").text().trim()).toBe(cy.filterPanel.hint);
  });

  it("should omit the hint and its description when no hint is given", () => {
    const $ = renderFilter(buildParams({ hint: undefined }));

    expect($(".app-filter__hint")).toHaveLength(0);
    expect($("button.app-filter__apply").attr("aria-describedby")).toBeUndefined();
  });

  it("should keep the MoJ structure, heading and data attributes for the filter toggle", () => {
    const $ = renderFilter(buildParams());
    const filter = $(".moj-filter");

    expect(filter.attr("data-module")).toBe("moj-filter");
    expect(filter.attr("data-show-text")).toBe("Show filters");
    expect(filter.attr("data-start-hidden")).toBe("false");
    expect($(".moj-filter__header-title h2").text().trim()).toBe("Filter");
    expect($(".moj-filter__header-action")).toHaveLength(1);
  });

  it("should default the button text to Apply filters", () => {
    const $ = renderFilter(buildParams({ submit: {} }));

    expect($("button.app-filter__apply").text().trim()).toBe("Apply filters");
  });

  it("should render selected filter tags and the clear link only when selected filters are given", () => {
    const withoutSelected = renderFilter(buildParams());
    expect(withoutSelected(".moj-filter__selected")).toHaveLength(0);

    const $ = renderFilter(
      buildParams({
        selectedFilters: {
          heading: { text: "Selected filters" },
          clearLink: { href: "/clear", text: "Clear filters" },
          categories: [{ heading: { text: "Jurisdiction" }, items: [{ href: "/remove", text: "Civil" }] }]
        }
      })
    );

    expect($(".moj-filter__selected-heading h2").text().trim()).toBe("Selected filters");
    expect($(".moj-filter__heading-action a").attr("href")).toBe("/clear");
    expect($(".moj-filter__selected h3").text().trim()).toBe("Jurisdiction");
    expect($("a.moj-filter__tag").attr("href")).toBe("/remove");
    expect($("a.moj-filter__tag").text()).toContain("Civil");
  });

  it("should have the same filter panel keys in English and Welsh", () => {
    expect(Object.keys(cy.filterPanel).sort()).toEqual(Object.keys(en.filterPanel).sort());
  });
});
