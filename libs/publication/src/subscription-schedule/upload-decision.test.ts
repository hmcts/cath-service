import { describe, expect, it } from "vitest";
import { getUploadSubscriptionDecision } from "./upload-decision.js";

const GMT_NOW = "2026-01-15T10:00:00.000Z";
const BST_NOW = "2026-06-15T10:00:00.000Z";
const LIST_TYPE_NAME = "CIVIL_DAILY_CAUSE_LIST";
const SEND_BOTH = { notifyEmail: true, pushThirdParty: true };
const FUTURE = { notifyEmail: false, pushThirdParty: false, reason: "FUTURE_DISPLAY_FROM" };
const EXPIRED = { notifyEmail: false, pushThirdParty: false, reason: "EXPIRED" };
const SCHEDULED = { notifyEmail: false, pushThirdParty: true, reason: "SCHEDULED_LIST_TYPE" };

describe("getUploadSubscriptionDecision", () => {
  it.each([
    { scenario: "no display dates", now: GMT_NOW, displayFrom: null, displayTo: null, expected: SEND_BOTH },
    { scenario: "displayFrom yesterday", now: GMT_NOW, displayFrom: "2026-01-14T00:00:00.000Z", displayTo: null, expected: SEND_BOTH },
    { scenario: "displayFrom today at 00:00Z", now: GMT_NOW, displayFrom: "2026-01-15T00:00:00.000Z", displayTo: null, expected: SEND_BOTH },
    { scenario: "displayFrom later today", now: GMT_NOW, displayFrom: "2026-01-15T14:00:00.000Z", displayTo: null, expected: SEND_BOTH },
    { scenario: "displayFrom exactly the end of the London day", now: GMT_NOW, displayFrom: "2026-01-16T00:00:00.000Z", displayTo: null, expected: FUTURE },
    { scenario: "displayFrom next week", now: GMT_NOW, displayFrom: "2026-01-22T00:00:00.000Z", displayTo: null, expected: FUTURE },
    { scenario: "displayFrom tomorrow at 00:00Z in BST", now: BST_NOW, displayFrom: "2026-06-16T00:00:00.000Z", displayTo: null, expected: FUTURE },
    {
      scenario: "a BST late-night upload when London is already the next day",
      now: "2026-06-01T23:30:00.000Z",
      displayFrom: "2026-06-02T00:00:00.000Z",
      displayTo: null,
      expected: SEND_BOTH
    },
    {
      scenario: "a BST evening upload before London midnight",
      now: "2026-06-01T22:30:00.000Z",
      displayFrom: "2026-06-02T00:00:00.000Z",
      displayTo: null,
      expected: FUTURE
    },
    { scenario: "displayTo yesterday", now: GMT_NOW, displayFrom: null, displayTo: "2026-01-14T12:00:00.000Z", expected: EXPIRED },
    {
      scenario: "displayTo one millisecond before the London day starts",
      now: GMT_NOW,
      displayFrom: null,
      displayTo: "2026-01-14T23:59:59.999Z",
      expected: EXPIRED
    },
    {
      scenario: "displayTo one millisecond before the BST London day starts",
      now: BST_NOW,
      displayFrom: null,
      displayTo: "2026-06-14T22:59:59.999Z",
      expected: EXPIRED
    },
    { scenario: "displayTo exactly the start of the London day", now: GMT_NOW, displayFrom: null, displayTo: "2026-01-15T00:00:00.000Z", expected: SEND_BOTH },
    { scenario: "displayTo earlier today than now", now: GMT_NOW, displayFrom: null, displayTo: "2026-01-15T09:00:00.000Z", expected: SEND_BOTH },
    { scenario: "displayTo today at 00:00Z in BST", now: BST_NOW, displayFrom: null, displayTo: "2026-06-15T00:00:00.000Z", expected: SEND_BOTH },
    { scenario: "displayTo tomorrow", now: GMT_NOW, displayFrom: null, displayTo: "2026-01-16T00:00:00.000Z", expected: SEND_BOTH }
  ])("should return the expected decision for $scenario", ({ now, displayFrom, displayTo, expected }) => {
    // Arrange
    const publication = {
      displayFrom: displayFrom ? new Date(displayFrom) : null,
      displayTo: displayTo ? new Date(displayTo) : null,
      listTypeName: LIST_TYPE_NAME
    };

    // Act
    const decision = getUploadSubscriptionDecision(publication, new Date(now));

    // Assert
    expect(decision).toEqual(expected);
  });

  it.each(["MAGISTRATES_ADULT_COURT_LIST_DAILY", "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY"])(
    "should skip email but push to third parties for the scheduled list type %s",
    (listTypeName) => {
      // Arrange
      const publication = { displayFrom: new Date("2026-01-15T00:00:00.000Z"), displayTo: null, listTypeName };

      // Act
      const decision = getUploadSubscriptionDecision(publication, new Date(GMT_NOW));

      // Assert
      expect(decision).toEqual(SCHEDULED);
    }
  );

  it("should send both for the non-scheduled MAGISTRATES_ADULT_COURT_LIST_FUTURE", () => {
    // Arrange
    const publication = { displayFrom: new Date("2026-01-15T00:00:00.000Z"), listTypeName: "MAGISTRATES_ADULT_COURT_LIST_FUTURE" };

    // Act
    const decision = getUploadSubscriptionDecision(publication, new Date(GMT_NOW));

    // Assert
    expect(decision).toEqual(SEND_BOTH);
  });

  it("should defer a scheduled list type that is also future-dated", () => {
    // Arrange
    const publication = { displayFrom: new Date("2026-01-16T00:00:00.000Z"), listTypeName: "MAGISTRATES_ADULT_COURT_LIST_DAILY" };

    // Act
    const decision = getUploadSubscriptionDecision(publication, new Date(GMT_NOW));

    // Assert
    expect(decision).toEqual(FUTURE);
  });

  it("should skip email but push to third parties when the list type name is unknown", () => {
    // Arrange
    const publication = { displayFrom: new Date("2026-01-15T00:00:00.000Z"), listTypeName: undefined };

    // Act
    const decision = getUploadSubscriptionDecision(publication, new Date(GMT_NOW));

    // Assert
    expect(decision).toEqual({ notifyEmail: false, pushThirdParty: true, reason: "LIST_TYPE_UNKNOWN" });
  });

  it("should apply the display rules before the unknown list type rule", () => {
    // Arrange
    const publication = { displayTo: new Date("2026-01-14T00:00:00.000Z"), listTypeName: undefined };

    // Act
    const decision = getUploadSubscriptionDecision(publication, new Date(GMT_NOW));

    // Assert
    expect(decision).toEqual(EXPIRED);
  });
});
