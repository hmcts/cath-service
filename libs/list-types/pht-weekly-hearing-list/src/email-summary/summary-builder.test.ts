import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return { ...actual };
});

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {}
}));

import type { PhtHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const HEARING: PhtHearingList[number] = {
  date: "02/01/2025",
  caseName: "A Vs B",
  hearingLength: "1 hour",
  hearingType: "Substantive hearing",
  venue: "Primary Health Tribunal",
  additionalInformation: "Remote hearing"
};

describe("extractCaseSummary", () => {
  it("should return one summary entry per hearing with Date and Case name fields", () => {
    const result = extractCaseSummary([HEARING]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Date", value: "02/01/2025" },
      { label: "Case name", value: "A Vs B" }
    ]);
  });

  it("should return an empty array for an empty hearing list", () => {
    expect(extractCaseSummary([])).toEqual([]);
  });

  it("should return one entry per hearing for multiple hearings", () => {
    const hearings: PhtHearingList = [HEARING, { ...HEARING, date: "03/01/2025", caseName: "C Vs D" }];

    const result = extractCaseSummary(hearings);

    expect(result).toHaveLength(2);
    expect(result[1]).toEqual([
      { label: "Date", value: "03/01/2025" },
      { label: "Case name", value: "C Vs D" }
    ]);
  });

  it("should use empty string when date is falsy", () => {
    const hearingWithEmptyDate = { ...HEARING, date: "" };

    const result = extractCaseSummary([hearingWithEmptyDate]);

    expect(result[0][0]).toEqual({ label: "Date", value: "" });
  });

  it("should use empty string when caseName is falsy", () => {
    const hearingWithEmptyCaseName = { ...HEARING, caseName: "" };

    const result = extractCaseSummary([hearingWithEmptyCaseName]);

    expect(result[0][1]).toEqual({ label: "Case name", value: "" });
  });

  it("should only include Date and Case name fields, ignoring other hearing fields", () => {
    const result = extractCaseSummary([HEARING]);

    expect(result[0]).toHaveLength(2);
    const labels = result[0].map((f) => f.label);
    expect(labels).toEqual(["Date", "Case name"]);
  });
});

describe("formatCaseSummaryForEmail (re-export)", () => {
  it("should be a function", () => {
    expect(typeof formatCaseSummaryForEmail).toBe("function");
  });

  it("should return 'No cases scheduled.' for an empty list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });

  it("should format a single case summary correctly", () => {
    const summary = extractCaseSummary([HEARING]);

    const result = formatCaseSummaryForEmail(summary);

    expect(result).toContain("Date - 02/01/2025");
    expect(result).toContain("Case name - A Vs B");
  });

  it("should separate multiple cases with dividers", () => {
    const hearings: PhtHearingList = [HEARING, { ...HEARING, date: "03/01/2025", caseName: "C Vs D" }];
    const summary = extractCaseSummary(hearings);

    const result = formatCaseSummaryForEmail(summary);

    expect(result).toContain("Date - 02/01/2025");
    expect(result).toContain("Date - 03/01/2025");
    expect(result).toContain("---");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING (re-export)", () => {
  it("should be a non-empty string", () => {
    expect(typeof SPECIAL_CATEGORY_DATA_WARNING).toBe("string");
    expect(SPECIAL_CATEGORY_DATA_WARNING.length).toBeGreaterThan(0);
  });

  it("should mention Special Category Data", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});
