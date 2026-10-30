import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pdfText } from "./pdf-text.js";

const TEST_FILES = path.join(path.dirname(fileURLToPath(import.meta.url)), "test-files");
const read = (name: string) => readFile(path.join(TEST_FILES, name));

describe("pdfText", () => {
  it("should read the same lines from the same content styled differently", async () => {
    // Act
    const plain = await pdfText(await read("plain.pdf"));
    const styled = await pdfText(await read("styled.pdf"));

    // Assert
    expect(styled.lines).toEqual(plain.lines);
    expect(plain.lines.slice(0, 3)).toEqual(["Civil Daily Cause List", "List for 1 September 2023", "10:00 Court 0 AB1000 Smith v Jones"]);
    expect(styled.pages).toBeGreaterThan(plain.pages);
  });

  it("should read a changed row as a changed line", async () => {
    // Act
    const plain = await pdfText(await read("plain.pdf"));
    const changed = await pdfText(await read("changed.pdf"));

    // Assert
    expect(changed.lines).toHaveLength(plain.lines.length);
    expect(plain.lines.filter((line) => !changed.lines.includes(line))).toEqual(["10:03 Court 3 AB1003 Smith v Jones"]);
  });
});
