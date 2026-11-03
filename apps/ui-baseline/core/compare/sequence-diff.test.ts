import { describe, expect, it } from "vitest";
import { diffSequences } from "./sequence-diff.js";

const words = (text: string) => text.split(" ").filter(Boolean);

describe("diffSequences", () => {
  it("should return one equal run when the sequences are the same", () => {
    // Act
    const runs = diffSequences(words("a b c"), words("a b c"));

    // Assert
    expect(runs).toEqual([{ kind: "equal", items: ["a", "b", "c"] }]);
  });

  it("should report a deletion and an insertion where a word changed", () => {
    // Act
    const runs = diffSequences(words("Court 1 at 10am"), words("Court 2 at 10am"));

    // Assert
    expect(runs).toEqual([
      { kind: "equal", items: ["Court"] },
      { kind: "delete", items: ["1"] },
      { kind: "insert", items: ["2"] },
      { kind: "equal", items: ["at", "10am"] }
    ]);
  });

  it("should keep the order of repeated items", () => {
    // Act
    const runs = diffSequences(words("x y x y"), words("x y x"));

    // Assert
    expect(runs).toEqual([
      { kind: "equal", items: ["x", "y", "x"] },
      { kind: "delete", items: ["y"] }
    ]);
  });

  it("should handle an empty side", () => {
    // Act
    const added = diffSequences([], words("a b"));
    const removed = diffSequences(words("a b"), []);

    // Assert
    expect(added).toEqual([{ kind: "insert", items: ["a", "b"] }]);
    expect(removed).toEqual([{ kind: "delete", items: ["a", "b"] }]);
  });

  it("should return null when the sequences need more edits than allowed", () => {
    // Act
    const runs = diffSequences(words("a b c d"), words("e f g h"), 3);

    // Assert
    expect(runs).toBeNull();
  });
});
