import { describe, expect, it } from "vitest";
import { normalise } from "./normalise.js";

const SEEDED = { seededAt: "2026-10-30T10:00:00Z" };

describe("normalise", () => {
  it("should replace known IDs by name and other UUIDs with a placeholder", () => {
    // Act
    const result = normalise("/list/d1c4 and 11111111-2222-3333-4444-555555555555", { knownIds: { "<artefact:civil>": "d1c4", "<artefact:none>": "" } });

    // Assert
    expect(result).toBe("/list/<artefact:civil> and <ID>");
  });

  it("should even out quotes, status announcements, local hosts and the lng parameter", () => {
    // Arrange
    const text = ["‘single’ “double”", "  - status: 3 results", "  - status", "http://localhost:8080/search?lng=cy&q=1", "https://127.0.0.1/a?x=1&lng=en"].join(
      "\n"
    );

    // Act
    const result = normalise(text);

    // Assert
    expect(result).toBe(["'single' \"double\"", "  - status", "  - status", "/search&q=1", "/a?x=1"].join("\n"));
  });

  it("should leave dates alone when there is no seed date", () => {
    // Act
    const result = normalise("30/10/2026 and 30 October 2026");

    // Assert
    expect(result).toBe("30/10/2026 and 30 October 2026");
  });

  it("should mask ISO timestamps near the seed date with their offset in days", () => {
    // Act
    const result = normalise("2026-10-30T10:12:16.123Z 2026-11-02T08:00 2026-10-25T23:59:59 2020-01-01T00:00:00Z", SEEDED);

    // Assert
    expect(result).toBe("<RUN_DATE> <RUN_TIME> <RUN_DATE+3> <RUN_TIME> <RUN_DATE-5> <RUN_TIME> 2020-01-01T00:00:00Z");
  });

  it("should mask numeric dates, with and without times and URL-encoded, near the seed date", () => {
    // Act
    const result = normalise("30/10/2026 10:12:16, 31/10/2026 10:12, 01%2F11%2F2026+10%3A12%3A16, 01/01/2020", SEEDED);

    // Assert
    expect(result).toBe("<RUN_DATE> <RUN_TIME>, <RUN_DATE+1> <RUN_TIME>, <RUN_DATE+2> <RUN_TIME>, 01/01/2020");
  });

  it("should mask written dates in English and Welsh, with ordinals, short months and times", () => {
    // Arrange
    const text = [
      "30 October 2026",
      "31st Oct 2026 at 10:30am",
      "1 Nov 2026, at 9.15 pm",
      "29 Sept 2026",
      "30 Hydref 2026 am 10:30yb",
      "2 Tachwedd 2026",
      "1 September 2023"
    ].join("\n");

    // Act
    const result = normalise(text, SEEDED);

    // Assert
    expect(result.split("\n")).toEqual([
      "<RUN_DATE>",
      "<RUN_DATE+1> <RUN_TIME>",
      "<RUN_DATE+2> <RUN_TIME>",
      "<RUN_DATE-31>",
      "<RUN_DATE> <RUN_TIME>",
      "<RUN_DATE+3>",
      "1 September 2023"
    ]);
  });
});
