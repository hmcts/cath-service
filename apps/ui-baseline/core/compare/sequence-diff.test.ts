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

  it("should rebuild both sequences from the runs, for sequences that differ in many ways", () => {
    // Arrange
    let seed = 7;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const words = (length: number) => Array.from({ length }, () => ["a", "b", "c", "d"][random(4)]);
    const pairs = Array.from({ length: 300 }, () => [words(random(40)), words(random(40))] as const);

    // Act
    const results = pairs.map(([a, b]) => ({ a, b, runs: diffSequences(a, b) }));

    // Assert
    for (const { a, b, runs } of results) {
      expect(runs?.filter((run) => run.kind !== "insert").flatMap((run) => run.items)).toEqual(a);
      expect(runs?.filter((run) => run.kind !== "delete").flatMap((run) => run.items)).toEqual(b);
      // As few edits as possible: everything but the longest common subsequence
      const edits = (runs ?? []).filter((run) => run.kind !== "equal").reduce((sum, run) => sum + run.items.length, 0);
      expect(edits).toBe(a.length + b.length - 2 * longestCommon(a, b));
    }
  });
});

function longestCommon(a: readonly string[], b: readonly string[]): number {
  const lengths = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) lengths[i][j] = a[i - 1] === b[j - 1] ? lengths[i - 1][j - 1] + 1 : Math.max(lengths[i - 1][j], lengths[i][j - 1]);
  return lengths[a.length][b.length];
}
