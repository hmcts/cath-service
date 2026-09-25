import { describe, expect, it } from "vitest";
import { findDisallowedHtmlTags, sanitiseHtml } from "./html-sanitisation.js";

describe("sanitiseHtml", () => {
  it.each([
    ["bold", "<strong>Court closed</strong>"],
    ["legacy bold", "<b>Court closed</b>"],
    ["emphasis", "<em>Court closed</em>"],
    ["paragraphs", "<p>First</p><p>Second</p>"],
    ["line breaks", "Closed<br />Reopens Monday"],
    ["unordered lists", "<ul><li>Monday</li></ul>"],
    ["ordered lists", "<ol><li>Monday</li></ol>"]
  ])("should preserve %s so legacy court messages render as authored", (_label, markup) => {
    // Act
    const result = sanitiseHtml(markup);

    // Assert
    expect(result).toBe(markup);
  });

  it("should preserve links with an allowed scheme", () => {
    // Arrange
    const markup = '<a href="https://www.gov.uk">Find a court</a>';

    // Act
    const result = sanitiseHtml(markup);

    // Assert
    expect(result).toBe(markup);
  });

  it("should preserve mailto links", () => {
    // Arrange
    const markup = '<a href="mailto:court@justice.gov.uk">Email the court</a>';

    // Act
    const result = sanitiseHtml(markup);

    // Assert
    expect(result).toBe(markup);
  });

  // The four payloads recorded on VIBE-522.
  it("should discard a script tag along with its contents", () => {
    // Act
    const result = sanitiseHtml("Court closed<script>alert(1)</script>");

    // Assert
    expect(result).toBe("Court closed");
  });

  it("should discard a meta refresh element", () => {
    // Act
    const result = sanitiseHtml('<meta http-equiv="refresh" content="0;url=https://evil.example">Court closed');

    // Assert
    expect(result).toBe("Court closed");
  });

  it("should discard an svg element carrying an onload handler", () => {
    // Act
    const result = sanitiseHtml('<svg onload="alert(1)"></svg>Court closed');

    // Assert
    expect(result).toBe("Court closed");
  });

  it("should discard an image carrying an onerror handler", () => {
    // Act
    const result = sanitiseHtml('<img src="x" onerror="alert(1)">Court closed');

    // Assert
    expect(result).toBe("Court closed");
  });

  it("should strip event handler attributes from an otherwise allowed tag", () => {
    // Act
    const result = sanitiseHtml('<strong onclick="alert(1)">Court closed</strong>');

    // Assert
    expect(result).toBe("<strong>Court closed</strong>");
  });

  it("should strip a javascript scheme from a link", () => {
    // Act
    const result = sanitiseHtml('<a href="javascript:alert(1)">Court closed</a>');

    // Assert
    expect(result).toBe("<a>Court closed</a>");
  });

  it("should strip a protocol relative href so links cannot be pointed off site implicitly", () => {
    // Act
    const result = sanitiseHtml('<a href="//evil.example">Court closed</a>');

    // Assert
    expect(result).toBe("<a>Court closed</a>");
  });

  it("should strip inline styles from an allowed tag", () => {
    // Act
    const result = sanitiseHtml('<p style="position:fixed;top:0">Court closed</p>');

    // Assert
    expect(result).toBe("<p>Court closed</p>");
  });

  it("should keep the text of a disallowed tag while dropping the tag itself", () => {
    // Act
    const result = sanitiseHtml("<div>Court closed</div>");

    // Assert
    expect(result).toBe("Court closed");
  });

  it("should leave plain text containing comparison operators untouched", () => {
    // Arrange
    const text = "Hearings start > 10am and finish < 4pm";

    // Act
    const result = sanitiseHtml(text);

    // Assert
    expect(result).toContain("10am");
    expect(result).toContain("4pm");
  });
});

describe("findDisallowedHtmlTags", () => {
  it("should return no tags for plain text", () => {
    // Act
    const result = findDisallowedHtmlTags("Hearings start at 10am. Call 0300 123 4567 (option 2).");

    // Assert
    expect(result).toEqual([]);
  });

  it("should return no tags when only allowed markup is used", () => {
    // Act
    const result = findDisallowedHtmlTags('<p><strong>Closed</strong></p><ul><li><a href="https://www.gov.uk">Guidance</a></li></ul>');

    // Assert
    expect(result).toEqual([]);
  });

  it("should return no tags for comparison operators followed by a word", () => {
    // Act
    const result = findDisallowedHtmlTags("Applies when fewer < ten cases are listed");

    // Assert
    expect(result).toEqual([]);
  });

  it("should return the disallowed tag name", () => {
    // Act
    const result = findDisallowedHtmlTags("Court closed<script>alert(1)</script>");

    // Assert
    expect(result).toEqual(["script"]);
  });

  it("should report a disallowed tag regardless of case", () => {
    // Act
    const result = findDisallowedHtmlTags("<DIV>Court closed</DIV>");

    // Assert
    expect(result).toEqual(["div"]);
  });

  it("should report each disallowed tag once", () => {
    // Act
    const result = findDisallowedHtmlTags("<div>One</div><div>Two</div>");

    // Assert
    expect(result).toEqual(["div"]);
  });

  it("should report every distinct disallowed tag", () => {
    // Act
    const result = findDisallowedHtmlTags('<div><strong>Closed</strong><img src="x"></div>');

    // Assert
    expect(result).toEqual(["div", "img"]);
  });
});
