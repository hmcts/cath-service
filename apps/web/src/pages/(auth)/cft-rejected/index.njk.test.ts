import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MYHMCTS_GUIDANCE_URL = "https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals";

describe("cft-rejected template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should have matching keys in en and cy locales", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });

  describe("English content", () => {
    it("should render the messages and the MyHMCTS guidance link without a heading", () => {
      const { $ } = render(env, "(auth)/cft-rejected/index.njk", { ...en });

      const paragraphs = $("main p.govuk-body");
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs.eq(0).text()).toBe(en.signedInMessage);
      expect(paragraphs.eq(1).text()).toBe(en.legalProfessionalsMessage);
      expect(paragraphs.eq(2).text()).toBe(en.returnHomeMessage);

      const guidanceLink = $(`a[href="${MYHMCTS_GUIDANCE_URL}"]`);
      expect(guidanceLink).toHaveLength(1);
      expect(guidanceLink.text()).toBe(en.myHmctsLinkText);

      expect($("main h1")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh messages and the MyHMCTS guidance link", () => {
      const { $ } = render(env, "(auth)/cft-rejected/index.njk", { ...cy });

      const paragraphs = $("main p.govuk-body");
      expect(paragraphs.eq(0).text()).toBe(cy.signedInMessage);
      expect(paragraphs.eq(1).text()).toBe(cy.legalProfessionalsMessage);
      expect(paragraphs.eq(2).text()).toBe(cy.returnHomeMessage);
      expect($(`a[href="${MYHMCTS_GUIDANCE_URL}"]`).text()).toBe(cy.myHmctsLinkText);
    });
  });
});
