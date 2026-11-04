import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

describe("listTypeData", () => {
  it("should flag only the magistrates daily list types as scheduled subscriptions", () => {
    // Arrange
    const expectedNames = ["MAGISTRATES_ADULT_COURT_LIST_DAILY", "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY"];

    // Act
    const scheduledNames = listTypeData.filter((listType) => listType.isScheduledSubscription).map((listType) => listType.name);

    // Assert
    expect(scheduledNames.sort()).toEqual(expectedNames.sort());
  });

  it.each(["MAGISTRATES_ADULT_COURT_LIST_FUTURE", "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE"])("should not flag %s as a scheduled subscription", (name) => {
    // Arrange
    const listType = listTypeData.find((entry) => entry.name === name);

    // Act
    const isScheduled = listType?.isScheduledSubscription;

    // Assert
    expect(listType).toBeDefined();
    expect(isScheduled).toBeFalsy();
  });
});
