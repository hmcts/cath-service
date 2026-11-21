import { afterEach, describe, expect, it } from "vitest";
import { buildFlooredDateFilter, type DateCondition, exactDayCondition, onOrBeforeCondition } from "./date-boundaries.js";

const DAY_MS = 86_400_000;

// Evaluates a filter produced by buildFlooredDateFilter against a single date, so the
// Prisma shape can be checked against PIP's GREATEST(CAST(col AS DATE), S) semantics.
function matchesFilter(filter: ReturnType<typeof buildFlooredDateFilter>, column: string, value: Date | null): boolean {
  return (filter.OR as Record<string, unknown>[]).some((branch) => {
    const conditions = "AND" in branch ? (branch.AND as Record<string, DateCondition>[]) : [branch as Record<string, DateCondition>];
    return conditions.every((condition) => {
      const { gte, lt } = condition[column];
      return value !== null && (gte === undefined || value >= gte) && (lt === undefined || value < lt);
    });
  });
}

function pipMatch(value: Date, startDate: Date, runDate: Date, days: number, mode: "exact" | "onOrBefore"): boolean {
  const toDay = (d: Date) => Math.floor(d.getTime() / DAY_MS);
  const effective = Math.max(toDay(value), toDay(startDate));
  const target = toDay(runDate) - days;
  return mode === "exact" ? effective === target : effective <= target;
}

describe("date boundaries", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  describe("exactDayCondition", () => {
    it("should return the UTC day N days ago just after midnight UTC", () => {
      const runDate = new Date("2026-11-19T00:00:01.000Z");

      expect(exactDayCondition(5, runDate)).toEqual({ gte: new Date("2026-11-14T00:00:00.000Z"), lt: new Date("2026-11-15T00:00:00.000Z") });
    });

    it("should return the same range just before the next UTC midnight", () => {
      const runDate = new Date("2026-11-19T23:59:59.999Z");

      expect(exactDayCondition(5, runDate)).toEqual({ gte: new Date("2026-11-14T00:00:00.000Z"), lt: new Date("2026-11-15T00:00:00.000Z") });
    });

    it("should use UTC days when the process runs in a non-UTC time zone", () => {
      process.env.TZ = "America/New_York";
      const runDate = new Date("2026-11-19T02:00:00.000Z");

      expect(exactDayCondition(1, runDate)).toEqual({ gte: new Date("2026-11-18T00:00:00.000Z"), lt: new Date("2026-11-19T00:00:00.000Z") });
    });
  });

  describe("onOrBeforeCondition", () => {
    it("should end at the start of the day after the target day", () => {
      const runDate = new Date("2026-11-19T08:01:00.000Z");

      expect(onOrBeforeCondition(132, runDate)).toEqual({ lt: new Date("2026-07-11T00:00:00.000Z") });
    });

    it("should use UTC days when the process runs in a non-UTC time zone", () => {
      process.env.TZ = "Asia/Tokyo";
      const runDate = new Date("2026-11-19T23:30:00.000Z");

      expect(onOrBeforeCondition(1, runDate)).toEqual({ lt: new Date("2026-11-19T00:00:00.000Z") });
    });
  });

  describe("buildFlooredDateFilter", () => {
    const runDate = new Date("2026-11-19T08:01:00.000Z");

    it("should add the floor branch when the start date itself is on or before the deletion day", () => {
      const startDate = new Date("2026-11-09T00:00:00.000Z");
      const condition = onOrBeforeCondition(5, runDate);

      const filter = buildFlooredDateFilter("lastSignedInDate", condition, startDate);

      expect(filter).toEqual({
        OR: [{ AND: [{ lastSignedInDate: condition }, { lastSignedInDate: { gte: startDate } }] }, { lastSignedInDate: { lt: startDate } }]
      });
    });

    it("should add the floor branch when the start date is exactly the reminder day", () => {
      const startDate = new Date("2026-11-14T00:00:00.000Z");
      const condition = exactDayCondition(5, runDate);

      const filter = buildFlooredDateFilter("lastVerifiedDate", condition, startDate);

      expect(filter.OR).toHaveLength(2);
      expect(filter.OR).toContainEqual({ lastVerifiedDate: { lt: startDate } });
    });

    it("should leave the floor branch out when the start date is after the target day", () => {
      const startDate = new Date("2026-11-16T00:00:00.000Z");
      const condition = onOrBeforeCondition(5, runDate);

      const filter = buildFlooredDateFilter("lastSignedInDate", condition, startDate);

      expect(filter).toEqual({ OR: [{ AND: [{ lastSignedInDate: condition }, { lastSignedInDate: { gte: startDate } }] }] });
    });

    it("should leave the floor branch out for an exact day when go-live is more than N days back", () => {
      const startDate = new Date("2025-01-01T00:00:00.000Z");
      const condition = exactDayCondition(118, runDate);

      const filter = buildFlooredDateFilter("lastSignedInDate", condition, startDate);

      expect(filter.OR).toHaveLength(1);
    });

    it("should treat users inactive before go-live as last active on go-live", () => {
      const startDate = new Date("2026-11-09T00:00:00.000Z");
      const longInactive = new Date("2024-01-01T12:00:00.000Z");

      expect(matchesFilter(buildFlooredDateFilter("lastSignedInDate", exactDayCondition(10, runDate), startDate), "lastSignedInDate", longInactive)).toBe(true);
      expect(matchesFilter(buildFlooredDateFilter("lastSignedInDate", exactDayCondition(11, runDate), startDate), "lastSignedInDate", longInactive)).toBe(
        false
      );
      expect(matchesFilter(buildFlooredDateFilter("lastSignedInDate", onOrBeforeCondition(11, runDate), startDate), "lastSignedInDate", longInactive)).toBe(
        false
      );
    });

    it("should never match a NULL date", () => {
      const startDate = new Date("2026-01-01T00:00:00.000Z");

      expect(matchesFilter(buildFlooredDateFilter("lastSignedInDate", onOrBeforeCondition(5, runDate), startDate), "lastSignedInDate", null)).toBe(false);
    });

    it.each([
      { label: "go-live recent, exact day", startOffset: 10, days: 10, mode: "exact" as const },
      { label: "go-live recent, on or before", startOffset: 10, days: 5, mode: "onOrBefore" as const },
      { label: "go-live after target, exact day", startOffset: 3, days: 5, mode: "exact" as const },
      { label: "go-live more than N days back, exact day", startOffset: 400, days: 350, mode: "exact" as const },
      { label: "go-live more than N days back, on or before", startOffset: 400, days: 365, mode: "onOrBefore" as const }
    ])("should match exactly the same dates as PIP's floored condition ($label)", ({ startOffset, days, mode }) => {
      const startDate = new Date(Date.UTC(2026, 10, 19) - startOffset * DAY_MS);
      const condition = mode === "exact" ? exactDayCondition(days, runDate) : onOrBeforeCondition(days, runDate);
      const filter = buildFlooredDateFilter("lastSignedInDate", condition, startDate);

      for (let offsetHours = -24 * 800; offsetHours <= 24 * 2; offsetHours += 7) {
        const value = new Date(runDate.getTime() + offsetHours * 3_600_000);
        expect(matchesFilter(filter, "lastSignedInDate", value), value.toISOString()).toBe(pipMatch(value, startDate, runDate, days, mode));
      }
    });
  });
});
