import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";
import { sanitiseHtmlFilter } from "./sanitise-html.js";

describe("sanitiseHtmlFilter", () => {
  it("should return a SafeString so nunjucks does not escape the allowed markup", () => {
    // Act
    const result = sanitiseHtmlFilter("<strong>Court closed</strong>");

    // Assert
    expect(result).toBeInstanceOf(nunjucks.runtime.SafeString);
    expect(result.toString()).toBe("<strong>Court closed</strong>");
  });

  it("should sanitise before marking the value safe", () => {
    // Act
    const result = sanitiseHtmlFilter('<strong>Court closed</strong><img src="x" onerror="alert(1)">');

    // Assert
    expect(result.toString()).toBe("<strong>Court closed</strong>");
  });

  it("should render unescaped when used as a nunjucks filter", () => {
    // Arrange
    const env = new nunjucks.Environment(null, { autoescape: true });
    env.addFilter("sanitiseHtml", sanitiseHtmlFilter);

    // Act
    const html = env.renderString("{{ message | sanitiseHtml }}", { message: "<b>Closed</b><script>alert(1)</script>" });

    // Assert
    expect(html).toBe("<b>Closed</b>");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a number", 42]
  ])("should return an empty SafeString for %s", (_label, value) => {
    // Act
    const result = sanitiseHtmlFilter(value);

    // Assert
    expect(result.toString()).toBe("");
  });
});
