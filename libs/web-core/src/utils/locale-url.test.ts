import { describe, expect, it } from "vitest";
import { withLocaleParam } from "./locale-url.js";

describe("withLocaleParam", () => {
  describe("Welsh locale", () => {
    it.each([
      ["/account-home", "/account-home?lng=cy"],
      ["/sjp-press-list?artefactId=abc-123", "/sjp-press-list?artefactId=abc-123&lng=cy"],
      ["/summary?locationId=1&lng=en", "/summary?locationId=1&lng=cy"],
      ["/summary?l%6Eg=en&locationId=1", "/summary?locationId=1&lng=cy"],
      ["/summary?lng&locationId=1", "/summary?locationId=1&lng=cy"],
      ["/a?x=a+b%20c&sig=ab%2Fc%3D#results", "/a?x=a+b%20c&sig=ab%2Fc%3D&lng=cy#results"],
      ["/a#section", "/a?lng=cy#section"]
    ])("should turn %s into %s", (url, expected) => {
      expect(withLocaleParam(url, "cy")).toBe(expected);
    });
  });

  describe("English locale", () => {
    it.each([
      ["/account-home", "/account-home"],
      ["/account-home?lng=cy", "/account-home"],
      ["/summary?locationId=1&lng=cy", "/summary?locationId=1"],
      ["/summary?l%6Eg=cy&locationId=1#top", "/summary?locationId=1#top"],
      ["/a?x=a+b%20c", "/a?x=a+b%20c"]
    ])("should turn %s into %s", (url, expected) => {
      expect(withLocaleParam(url, "en")).toBe(expected);
    });
  });

  it("should keep parameters whose key is not lng, including case variants the locale middleware ignores", () => {
    expect(withLocaleParam("/a?LNG=en&lngx=1&%E0%A4%A=1", "cy")).toBe("/a?LNG=en&lngx=1&%E0%A4%A=1&lng=cy");
  });
});
