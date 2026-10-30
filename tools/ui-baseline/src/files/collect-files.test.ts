import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { BlobContainer } from "./blob-container.js";
import { collectFiles } from "./collect-files.js";

function memoryContainer(blobs: Record<string, string>): BlobContainer {
  return {
    name: "memory",
    download: async (name) => (name in blobs ? Buffer.from(blobs[name]) : null),
    upload: async () => {},
    uploadFile: async () => {},
    downloadToFile: async () => {}
  };
}

describe("collectFiles", () => {
  it("should download each kind of file a publication has and index them", async () => {
    // Arrange
    const out = await mkdtemp(path.join(tmpdir(), "collect-"));
    const container = memoryContainer({ "a1.pdf": "pdf", "a1_cy.pdf": "welsh", "a2.xlsx": "excel" });

    // Act
    const entries = await collectFiles({
      container,
      out,
      publications: [
        { id: "civil", artefactId: "a1", seededAt: "2026-10-30T10:00:00Z" },
        { id: "sjp", artefactId: "a2" }
      ]
    });

    // Assert
    expect(entries.map((entry) => `${entry.id} ${entry.kind} ${entry.blob} ${entry.file}`)).toEqual([
      "civil pdf a1.pdf civil/pdf.pdf",
      "civil pdf-welsh a1_cy.pdf civil/pdf-welsh.pdf",
      "sjp excel a2.xlsx sjp/excel.xlsx"
    ]);
    expect(entries[0].seededAt).toBe("2026-10-30T10:00:00Z");
    expect(await readFile(path.join(out, "civil/pdf-welsh.pdf"), "utf-8")).toBe("welsh");
    expect((await readFile(path.join(out, "index.jsonl"), "utf-8")).trim().split("\n")).toHaveLength(3);
  });

  it("should record nothing for a publication with no files", async () => {
    // Arrange
    const out = await mkdtemp(path.join(tmpdir(), "collect-"));

    // Act
    const entries = await collectFiles({ container: memoryContainer({}), out, publications: [{ id: "civil", artefactId: "a1" }] });

    // Assert
    expect(entries).toEqual([]);
    expect(await readFile(path.join(out, "index.jsonl"), "utf-8")).toBe("");
  });
});
