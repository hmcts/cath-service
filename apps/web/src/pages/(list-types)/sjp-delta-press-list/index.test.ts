import { describe, expect, it } from "vitest";
import * as fullDownload from "../sjp-press-list/download.js";
import * as fullIndex from "../sjp-press-list/index.js";
import * as fullDisclaimer from "../sjp-press-list/list-download-disclaimer.js";
import * as fullFiles from "../sjp-press-list/list-download-files.js";
import * as deltaDownload from "./download.js";
import * as deltaIndex from "./index.js";
import * as deltaDisclaimer from "./list-download-disclaimer.js";
import * as deltaFiles from "./list-download-files.js";

describe("sjp-delta-press-list routes", () => {
  it.each([
    ["index", deltaIndex, fullIndex],
    ["list-download-disclaimer", deltaDisclaimer, fullDisclaimer],
    ["list-download-files", deltaFiles, fullFiles],
    ["download", deltaDownload, fullDownload]
  ])("%s serves the sjp-press-list handlers", (_route, delta, full) => {
    // Arrange
    const expected = Object.keys(full).sort();

    // Act
    const actual = Object.keys(delta).sort();

    // Assert
    expect(actual).toEqual(expected);
    for (const method of expected) {
      expect(delta[method as keyof typeof delta]).toBe(full[method as keyof typeof full]);
    }
  });
});
