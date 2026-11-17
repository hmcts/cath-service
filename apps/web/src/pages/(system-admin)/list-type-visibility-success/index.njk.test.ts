import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(system-admin)/list-type-visibility-success/index.njk";

describe("list-type-visibility-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should render the hidden panel", () => {
    const { $ } = render(env, TEMPLATE, { t: en, title: en.successHiddenTitle, body: en.successHiddenBody });

    expect($(".govuk-panel__title").text().trim()).toBe(en.successHiddenTitle);
    expect($(".govuk-panel__body").text().trim()).toBe(en.successHiddenBody);
  });

  it("should render the shown panel", () => {
    const { $ } = render(env, TEMPLATE, { t: en, title: en.successShownTitle, body: en.successShownBody });

    expect($(".govuk-panel__title").text().trim()).toBe(en.successShownTitle);
  });

  it("should link back to manage list types", () => {
    const { $ } = render(env, TEMPLATE, { t: en, title: en.successHiddenTitle, body: en.successHiddenBody });

    expect($('a[href="/manage-list-types"]').text().trim()).toBe(en.manageListTypesLink);
    expect($('a[href="/system-admin-dashboard"]').text().trim()).toBe(en.returnLink);
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, { t: cy, title: cy.successHiddenTitle, body: cy.successHiddenBody });

    expect($(".govuk-panel__title").text().trim()).toBe(cy.successHiddenTitle);
    expect($('a[href="/manage-list-types"]').text().trim()).toBe(cy.manageListTypesLink);
  });

  it("should have matching keys in English and Welsh content", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
  });
});
