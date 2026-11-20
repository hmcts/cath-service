import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/manage-list-type/index.njk";

function buildListType(overrides = {}) {
  return {
    id: 7,
    name: "TEST_LIST",
    friendlyName: "Test List",
    welshFriendlyName: "Rhestr Prawf",
    shortenedFriendlyName: "Test",
    url: "test-list",
    caseNumberJsonFieldName: null,
    caseNameJsonFieldName: null,
    defaultSensitivity: "Public",
    allowedProvenance: ["CFT_IDAM"],
    isNonStrategic: false,
    isHidden: false,
    ...overrides
  };
}

function statusCell($: ReturnType<typeof render>["$"], label: string) {
  return $("tbody tr")
    .filter((_, row) => $(row).find("th").text().trim() === label)
    .find("td");
}

describe("manage-list-type template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should render a green Visible tag and a Hide button for a visible list type", () => {
    const { $ } = render(env, TEMPLATE, { t: en, listType: buildListType(), subJurisdictionsText: "Civil" });

    const tag = statusCell($, en.statusLabel).find(".govuk-tag");
    expect(tag.text().trim()).toBe(en.visibleTag);
    expect(tag.hasClass("govuk-tag--green")).toBe(true);
    const button = $('a.govuk-button[href="/list-type-visibility?id=7"]');
    expect(button).toHaveLength(1);
    expect(button.text().trim()).toBe(en.hideButton);
  });

  it("should render a grey Hidden tag and a Show button for a hidden list type", () => {
    const { $ } = render(env, TEMPLATE, { t: en, listType: buildListType({ isHidden: true }), subJurisdictionsText: "Civil" });

    const tag = statusCell($, en.statusLabel).find(".govuk-tag");
    expect(tag.text().trim()).toBe(en.hiddenTag);
    expect(tag.hasClass("govuk-tag--grey")).toBe(true);
    expect($('a.govuk-button[href="/list-type-visibility?id=7"]').text().trim()).toBe(en.showButton);
  });

  it("should keep the edit and delete buttons", () => {
    const { $ } = render(env, TEMPLATE, { t: en, listType: buildListType(), subJurisdictionsText: "Civil" });

    expect($('a[href="/edit-list-type?id=7"]').text().trim()).toBe(en.editButton);
    expect($('a[href="/delete-list-type?id=7"]').text().trim()).toBe(en.deleteButton);
  });

  it("should render Welsh status and button text when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, { t: cy, listType: buildListType({ isHidden: true }), subJurisdictionsText: "Sifil" });

    expect(statusCell($, cy.statusLabel).find(".govuk-tag").text().trim()).toBe(cy.hiddenTag);
    expect($('a[href="/list-type-visibility?id=7"]').text().trim()).toBe(cy.showButton);
  });

  it("should have matching keys in English and Welsh content", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
  });
});
