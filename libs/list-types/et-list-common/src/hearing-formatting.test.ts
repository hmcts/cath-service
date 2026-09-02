import type { Session, Sitting } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import { calculateSittingDuration, formatAddress, resolveHearingChannel } from "./hearing-formatting.js";

describe("formatAddress", () => {
  it("should return an empty array when address is undefined", () => {
    expect(formatAddress(undefined)).toEqual([]);
  });

  it("should build address lines from all present fields", () => {
    expect(formatAddress({ line: ["1 Court Street", ""], town: "Leeds", county: "West Yorkshire", postCode: "LS1 2ES" })).toEqual([
      "1 Court Street",
      "Leeds",
      "West Yorkshire",
      "LS1 2ES"
    ]);
  });
});

describe("calculateSittingDuration", () => {
  it("should compute hours and minutes from start and end", () => {
    const sitting = { sittingStart: "2025-01-13T09:00:00.000Z", sittingEnd: "2025-01-13T10:30:00.000Z", hearing: [] } as Sitting;
    expect(calculateSittingDuration(sitting)).toEqual({ durationAsHours: 1, durationAsMinutes: 30 });
  });

  it("should return zeroes when start or end is missing", () => {
    const sitting = { sittingStart: "2025-01-13T09:00:00.000Z", hearing: [] } as Sitting;
    expect(calculateSittingDuration(sitting)).toEqual({ durationAsHours: 0, durationAsMinutes: 0 });
  });
});

describe("resolveHearingChannel", () => {
  it("should prefer the sitting channel", () => {
    const sitting = { channel: ["VIDEO"], hearing: [] } as unknown as Sitting;
    const session = { sessionChannel: ["IN PERSON"], sittings: [] } as unknown as Session;
    expect(resolveHearingChannel(sitting, session)).toBe("VIDEO");
  });

  it("should fall back to the session channel", () => {
    const sitting = { hearing: [] } as unknown as Sitting;
    const session = { sessionChannel: ["IN PERSON"], sittings: [] } as unknown as Session;
    expect(resolveHearingChannel(sitting, session)).toBe("IN PERSON");
  });

  it("should return an empty string when neither is set", () => {
    const sitting = { hearing: [] } as unknown as Sitting;
    const session = { sittings: [] } as unknown as Session;
    expect(resolveHearingChannel(sitting, session)).toBe("");
  });
});
