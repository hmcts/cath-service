import { describe, expect, it } from "vitest";
import { seedResolver } from "./downloads.js";

describe("seedResolver", () => {
  it("should give a fixture's artefact id and a record's field from an app's seed", () => {
    // Arrange
    const resolve = seedResolver({ "sjp-press-list": { artefactId: "a1" } }, { "pending-application": { applicantId: "m1", imageId: "i1" } });

    // Act and assert
    expect(resolve("publication:sjp-press-list")).toBe("a1");
    expect(resolve("record:pending-application.imageId")).toBe("i1");
  });

  it("should give null for anything the seed does not have", () => {
    // Arrange
    const resolve = seedResolver({}, undefined);

    // Act and assert
    expect(resolve("publication:missing")).toBeNull();
    expect(resolve("record:pending-application.imageId")).toBeNull();
    expect(resolve("other:thing")).toBeNull();
  });
});
