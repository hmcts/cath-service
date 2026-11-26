import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(system-admin)/location-jurisdiction-manage/index.njk";

const tableRows = [[{ text: "Oxford Combined Court Centre" }, { text: "Civil" }, { text: "Civil Court" }]];

function renderPage(locale: typeof en | typeof cy = en, rows: unknown[] = tableRows) {
  return render(env, TEMPLATE, {
    ...locale,
    tableRows: rows,
    updateHref: "/location-jurisdiction-update",
    deleteHref: "/location-jurisdiction-delete"
  });
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

describe("location-jurisdiction-manage template", () => {
  it("should have matching English and Welsh locale keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });

  it("should render a visually hidden table caption", () => {
    const { $ } = renderPage();

    const caption = $("table caption");
    expect(caption).toHaveLength(1);
    expect(caption.text().trim()).toBe(en.tableCaption);
    expect(caption.hasClass("govuk-visually-hidden")).toBe(true);
  });

  it("should render the Welsh caption when the cy locale is used", () => {
    const { $ } = renderPage(cy);

    expect($("table caption").text().trim()).toBe(cy.tableCaption);
  });

  it("should not render a table when the location has no jurisdictions", () => {
    const { $ } = renderPage(en, []);

    expect($("table")).toHaveLength(0);
    expect($(".govuk-button-group .govuk-button")).toHaveLength(2);
  });
});
