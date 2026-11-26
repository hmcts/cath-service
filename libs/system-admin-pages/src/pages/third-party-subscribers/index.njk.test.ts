import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "index.njk";

const users = [{ id: "00000000-0000-0000-0000-000000000001", name: "Test Corp", createdAt: "01/01/2026" }];

function renderPage(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, { ...locale, en, cy, users, lngParam: "", ...overrides });
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("third-party-subscribers template", () => {
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

  it("should give every column header visible text", () => {
    const { $ } = renderPage();

    const headers = $("thead th")
      .map((_, el) => $(el).text().trim())
      .get();
    expect(headers).toEqual([en.tableHeadings.name, en.tableHeadings.createdDate, en.tableHeadings.actions]);
  });

  it("should render the Welsh caption when the cy locale is used", () => {
    const { $ } = renderPage(cy, { lngParam: "?lng=cy" });

    expect($("table caption").text().trim()).toBe(cy.tableCaption);
  });

  it("should show the empty message and no table when there are no subscribers", () => {
    const { $ } = renderPage(en, { users: [] });

    expect($("table")).toHaveLength(0);
    expect($("main p.govuk-body").text()).toContain(en.noUsersMessage);
  });
});
