import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MACRO_CALLER = '{% from "components/back-to-top.njk" import appBackToTop %}{{ appBackToTop({ text: text }) }}';

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.resolve(__dirname, "..")]);
});

function renderBackToTop(text: string) {
  const html = env.renderString(MACRO_CALLER, { text });
  return render(env, "components/back-to-top.njk", {}).$.load(html);
}

describe("appBackToTop macro", () => {
  it("should link to the main content rather than the top of the document", () => {
    const $ = renderBackToTop("Back to top");

    expect($("a.app-back-to-top__link")).toHaveLength(1);
    expect($("a.app-back-to-top__link").attr("href")).toBe("#main-content");
  });

  it("should render the given text as the accessible name with the arrow hidden from assistive technology", () => {
    const $ = renderBackToTop("Back to top");
    const link = $("a.app-back-to-top__link");

    expect(link.find('span[aria-hidden="true"]')).toHaveLength(1);
    expect(link.clone().children("span").remove().end().text().trim()).toBe("Back to top");
    expect(link.attr("aria-label")).toBeUndefined();
  });

  it("should render Welsh text", () => {
    const $ = renderBackToTop("Yn ôl i frig y dudalen");

    expect($("a.app-back-to-top__link").text()).toContain("Yn ôl i frig y dudalen");
  });

  it("should wrap the link in a govuk-body paragraph", () => {
    const $ = renderBackToTop("Back to top");

    expect($("p.govuk-body.app-back-to-top > a.app-back-to-top__link")).toHaveLength(1);
  });
});
