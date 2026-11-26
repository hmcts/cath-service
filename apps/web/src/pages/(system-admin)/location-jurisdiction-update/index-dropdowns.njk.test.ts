import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/location-jurisdiction-update/index-dropdowns.njk";

function buildItem(id: number, text: string, checked = false) {
  return { id: `subJurisdiction-${id}`, value: id.toString(), text, checked };
}

function buildRegion(id: number, text: string, checked = false) {
  return { id: `region-${id}`, value: id.toString(), text, checked };
}

function buildData(locale: typeof en | typeof cy = en) {
  return {
    ...locale,
    locationName: "Test Court",
    subJurisdictionGroups: [
      {
        heading: locale.civilCourtLabel,
        items: [buildItem(1, "Civil Court"), buildItem(5, "Court of Appeal (Civil Division)"), buildItem(10, "High Court", true)]
      },
      {
        heading: locale.criminalCourtLabel,
        items: [buildItem(2, "Crown Court"), buildItem(6, "Magistrates Court")]
      },
      {
        heading: locale.familyCourtLabel,
        items: [buildItem(3, "Family Court"), buildItem(7, "Court of Protection")]
      }
    ],
    regionCheckboxes: [buildRegion(1, "London"), buildRegion(2, "Midlands", true), buildRegion(3, "Wales")],
    cancelHref: locale.cancelHref
  };
}

describe("location-jurisdiction-update dropdowns template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should give every checkbox a unique id", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const ids = $("input[type=checkbox]")
      .map((_, el) => $(el).attr("id"))
      .get();

    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have no duplicate ids anywhere on the page", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const ids = $("[id]")
      .map((_, el) => $(el).attr("id"))
      .get();

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should use the data-driven ids for sub-jurisdiction and region checkboxes", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("#subJurisdiction-10").attr("name")).toBe("subJurisdictionIds");
    expect($("#subJurisdiction-10").attr("value")).toBe("10");
    expect($("#region-2").attr("name")).toBe("regionIds");
    expect($("#region-2").attr("value")).toBe("2");
  });

  it("should link every checkbox label to exactly one input with the matching label text", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const labels = $("label.govuk-checkboxes__label");
    expect(labels).toHaveLength(10);

    labels.each((_, label) => {
      const forId = $(label).attr("for");
      expect($(`[id="${forId}"]`)).toHaveLength(1);
      expect($(`input#${forId}[type=checkbox]`)).toHaveLength(1);
    });

    expect($('label[for="subJurisdiction-10"]').text().trim()).toBe("High Court");
    expect($('label[for="region-3"]').text().trim()).toBe("Wales");
  });

  it("should keep checked state on the correct checkboxes", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("#subJurisdiction-10").attr("checked")).toBeDefined();
    expect($("#region-2").attr("checked")).toBeDefined();
    expect($("#subJurisdiction-1").attr("checked")).toBeUndefined();
  });

  it("should render a fieldset legend for each group and for regions", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const legends = $("legend")
      .map((_, el) => $(el).text().trim())
      .get();

    expect(legends).toEqual([en.civilCourtLabel, en.criminalCourtLabel, en.familyCourtLabel, en.regionLabel]);
  });

  it("should render Welsh legends when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, buildData(cy));

    const legends = $("legend")
      .map((_, el) => $(el).text().trim())
      .get();

    expect(legends).toEqual([cy.civilCourtLabel, cy.criminalCourtLabel, cy.familyCourtLabel, cy.regionLabel]);
    expect($("h2.govuk-heading-m").text().trim()).toBe(cy.title);
  });

  it("should have matching keys in English and Welsh locale files", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
