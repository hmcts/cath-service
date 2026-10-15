import { describe, expect, it } from "vitest";
import { findWriteDrift } from "./write-drift.js";

const ROW = { id: "a", name: "Courtel", createdDate: new Date("2026-10-09T10:00:00Z"), listTypeIds: [1, 2] };

describe("findWriteDrift", () => {
  it("should return null when every expected row was written unchanged", () => {
    // Arrange
    const written = [{ ...ROW, createdDate: new Date(ROW.createdDate), generatedColumn: "ignored" }];

    // Act
    const result = findWriteDrift("legacy_third_party_user", [ROW], written, "id");

    // Assert
    expect(result).toBeNull();
  });

  it("should report a row the write lost", () => {
    // Act
    const result = findWriteDrift("legacy_third_party_user", [ROW, { ...ROW, id: "b" }], [ROW], "id");

    // Assert
    expect(result).toBe("legacy_third_party_user: written rows differ from the transformed legacy rows; 1 missing (b)");
  });

  it("should report a row whose written value differs", () => {
    // Arrange
    const written = [{ ...ROW, createdDate: new Date("2026-10-09T00:00:00Z") }];

    // Act
    const result = findWriteDrift("legacy_third_party_user", [ROW], written, "id");

    // Assert
    expect(result).toContain("1 differing (a)");
  });

  it("should report a row left behind that the run did not write", () => {
    // Act
    const result = findWriteDrift("legacy_third_party_user", [ROW], [ROW, { ...ROW, id: "stale" }], "id");

    // Assert
    expect(result).toContain("1 unexpected (stale)");
  });

  it("should treat an expected null and a written null as equal", () => {
    // Arrange
    const expected = [{ id: "a", firstName: null }];

    // Act
    const result = findWriteDrift("user", expected, [{ id: "a", firstName: null }], "id");

    // Assert
    expect(result).toBeNull();
  });

  it("should ignore expected fields left undefined, which the database fills with its default", () => {
    // Arrange
    const expected = [{ id: "a", status: undefined }];

    // Act
    const result = findWriteDrift("media_application", expected, [{ id: "a", status: "PENDING" }], "id");

    // Assert
    expect(result).toBeNull();
  });

  it("should compare array order", () => {
    // Act
    const result = findWriteDrift("subscription_list_type", [ROW], [{ ...ROW, listTypeIds: [2, 1] }], "id");

    // Assert
    expect(result).toContain("1 differing (a)");
  });

  it("should cap the ids it reports", () => {
    // Arrange
    const expected = Array.from({ length: 12 }, (_, index) => ({ ...ROW, id: `id-${index}` }));

    // Act
    const result = findWriteDrift("legacy_third_party_user", expected, [], "id");

    // Assert
    expect(result).toBe(
      "legacy_third_party_user: written rows differ from the transformed legacy rows; 12 missing (id-0, id-1, id-2, id-3, id-4, id-5, id-6, id-7, id-8, id-9, …)"
    );
  });
});
