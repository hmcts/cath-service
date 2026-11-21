import { DateTime } from "luxon";

const LONDON_TIME_ZONE = "Europe/London";

export function getLondonDay(now: Date): LondonDay {
  const start = DateTime.fromJSDate(now).setZone(LONDON_TIME_ZONE).startOf("day");
  // contentDate is a @db.Date column, which Prisma reads and writes as UTC midnight.
  const contentDate = DateTime.fromISO(start.toISODate() as string, { zone: "utc" });

  return {
    start: start.toJSDate(),
    end: start.plus({ days: 1 }).toJSDate(),
    contentDate: contentDate.toJSDate()
  };
}

export interface LondonDay {
  start: Date;
  end: Date;
  contentDate: Date;
}
