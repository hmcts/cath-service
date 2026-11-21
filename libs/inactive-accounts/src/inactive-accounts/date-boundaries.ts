import type { Prisma } from "@hmcts/postgres-prisma";

const MS_PER_DAY = 86_400_000;

// Same as PIP's `CAST(col AS DATE) = CURRENT_DATE - days`, expressed as a UTC day range
export function exactDayCondition(daysAgo: number, runDate: Date): DateCondition {
  return { gte: utcDayStart(daysAgo, runDate), lt: utcDayStart(daysAgo - 1, runDate) };
}

// Same as PIP's `CAST(col AS DATE) <= CURRENT_DATE - days`
export function onOrBeforeCondition(daysAgo: number, runDate: Date): DateCondition {
  return { lt: utcDayStart(daysAgo - 1, runDate) };
}

// Compares GREATEST(col, startDate) against the condition, so activity before go-live counts as go-live.
// A NULL column fails both branches, matching PIP where a NULL date never matches.
export function buildFlooredDateFilter(column: DateColumn, condition: DateCondition, startDate: Date): Prisma.UserWhereInput {
  const ownDateBranch: Prisma.UserWhereInput = { AND: [{ [column]: condition }, { [column]: { gte: startDate } }] };
  if (!isWithinCondition(startDate, condition)) {
    return { OR: [ownDateBranch] };
  }

  return { OR: [ownDateBranch, { [column]: { lt: startDate } }] };
}

function utcDayStart(daysAgo: number, runDate: Date): Date {
  const todayStart = Date.UTC(runDate.getUTCFullYear(), runDate.getUTCMonth(), runDate.getUTCDate());
  return new Date(todayStart - daysAgo * MS_PER_DAY);
}

function isWithinCondition(date: Date, condition: DateCondition): boolean {
  const isAfterLowerBound = condition.gte === undefined || date >= condition.gte;
  return isAfterLowerBound && date < condition.lt;
}

export type DateColumn = "lastVerifiedDate" | "lastSignedInDate";

export interface DateCondition {
  gte?: Date;
  lt: Date;
}
