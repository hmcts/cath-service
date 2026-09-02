import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "./nunjucks-test-helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES = path.join(__dirname, "fixtures");
const TEMPLATE = "sample.njk";

describe("nunjucks-test-helper", () => {
  let env: ReturnType<typeof createTestEnvironment>;

  beforeEach(() => {
    env = createTestEnvironment([FIXTURES]);
  });

  describe("createTestEnvironment", () => {
    it("builds an environment that resolves templates from the given paths", () => {
      const { html } = render(env, TEMPLATE, { heading: "Hello" });

      expect(html).toContain("<h1>Hello</h1>");
    });

    it("autoescapes output by default", () => {
      const { html } = render(env, TEMPLATE, { heading: "<script>" });

      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<script>");
    });

    it("returns an isolated environment per call (no shared global state)", () => {
      const first = createTestEnvironment([FIXTURES]);
      const second = createTestEnvironment([FIXTURES]);

      expect(first).not.toBe(second);
    });

    it("merges caller-provided options over the defaults", () => {
      const trimmed = createTestEnvironment([FIXTURES], { trimBlocks: true, lstripBlocks: true });

      const { html } = render(trimmed, TEMPLATE, { heading: "H", trimmed: true });

      expect(html).toContain("yes");
    });
  });

  describe("render", () => {
    it("returns both the raw html and a cheerio instance", () => {
      const { html, $ } = render(env, TEMPLATE, { heading: "Title" });

      expect(typeof html).toBe("string");
      expect($("h1").text()).toBe("Title");
    });
  });

  describe("assertNoErrors", () => {
    it("passes when no error summary is rendered", () => {
      const { $ } = render(env, TEMPLATE, { heading: "No errors" });

      expect(() => assertNoErrors($)).not.toThrow();
    });

    it("fails when an error summary is present", () => {
      const { $ } = render(env, TEMPLATE, { heading: "Has errors", errors: [{ text: "Something went wrong" }] });

      expect(() => assertNoErrors($)).toThrow();
    });
  });

  describe("assertErrorSummary", () => {
    it("passes when the summary lists all expected messages", () => {
      const { $ } = render(env, TEMPLATE, {
        heading: "Errors",
        errors: [{ text: "Enter your name" }, { text: "Enter your email" }]
      });

      expect(() => assertErrorSummary($, ["Enter your name", "Enter your email"])).not.toThrow();
    });

    it("fails when an expected message is missing from the summary", () => {
      const { $ } = render(env, TEMPLATE, { heading: "Errors", errors: [{ text: "Enter your name" }] });

      expect(() => assertErrorSummary($, ["Enter your email"])).toThrow();
    });

    it("fails when no error summary is rendered", () => {
      const { $ } = render(env, TEMPLATE, { heading: "No errors" });

      expect(() => assertErrorSummary($, ["Enter your name"])).toThrow();
    });
  });
});
