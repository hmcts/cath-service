import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BlobContainer } from "./blob-container.js";
import { withVersions } from "./blob-versions.test-helper.js";
import { collectFiles } from "./collect-files.js";

function memoryContainer(blobs: Record<string, string>): BlobContainer {
  const store: Omit<BlobContainer, "downloadVersioned" | "uploadIfUnchanged"> = {
    name: "memory",
    download: async (name) => (name in blobs ? Buffer.from(blobs[name]) : null),
    size: async (name) => (name in blobs ? Buffer.byteLength(blobs[name]) : null),
    upload: async () => {},
    uploadFile: async () => {},
    downloadToFile: async () => {},
    list: async () => []
  };
  return withVersions(store);
}

// Moves a faked clock on to each poll, letting real file I/O finish in between, so the clock only
// advances while the code is waiting for its next poll
async function withClockRunning<T>(promise: Promise<T>): Promise<T> {
  let done = false;
  promise.finally(() => {
    done = true;
  });
  while (!done) {
    await new Promise((resolve) => setImmediate(resolve));
    if (vi.getTimerCount() > 0) await vi.advanceTimersToNextTimerAsync();
  }
  return promise;
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

  describe("when waiting for the files", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should poll the files' sizes until they stop changing, then download each once", async () => {
      // Arrange
      const out = await mkdtemp(path.join(tmpdir(), "collect-"));
      vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
      // The PDF appears on the second look and grows once before it settles
      const versions = [null, "pd", "pdf", "pdf", "pdf"];
      let looks = 0;
      let current: string | null = null;
      const downloaded: string[] = [];
      const container: BlobContainer = {
        ...memoryContainer({}),
        size: async (name) => {
          if (name !== "a1.pdf") return null;
          current = versions[Math.min(looks++, versions.length - 1)];
          return current === null ? null : current.length;
        },
        download: async (name) => {
          downloaded.push(name);
          return current === null ? null : Buffer.from(current);
        }
      };

      // Act
      const entries = await withClockRunning(collectFiles({ container, out, waitSeconds: 60, publications: [{ id: "civil", artefactId: "a1" }] }));

      // Assert
      expect(looks).toBe(4);
      expect(downloaded).toEqual(["a1.pdf"]);
      expect(entries).toEqual([expect.objectContaining({ kind: "pdf", bytes: 3 })]);
      expect(await readFile(path.join(out, "civil/pdf.pdf"), "utf-8")).toBe("pdf");
    });

    it("should keep polling past a PDF that has settled until the Excel the publication should have appears", async () => {
      // Arrange
      const out = await mkdtemp(path.join(tmpdir(), "collect-"));
      vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
      // The PDF is there from the first look; the Excel is written three polls later
      let polls = 0;
      const container: BlobContainer = {
        ...memoryContainer({ "a1.pdf": "pdf", "a1.xlsx": "excel" }),
        size: async (name) => {
          if (name === "a1.pdf") polls++;
          if (name === "a1.pdf") return 3;
          if (name === "a1.xlsx" && polls > 3) return 5;
          return null;
        }
      };

      // Act
      const entries = await withClockRunning(
        collectFiles({ container, out, waitSeconds: 60, publications: [{ id: "civil", artefactId: "a1", expectedKinds: ["pdf", "excel"] }] })
      );

      // Assert
      expect(entries.map((entry) => entry.kind)).toEqual(["pdf", "excel"]);
      expect(polls).toBe(5);
    });

    it("should stop at the deadline with what there is when an expected file never appears", async () => {
      // Arrange
      const out = await mkdtemp(path.join(tmpdir(), "collect-"));
      vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
      const container = memoryContainer({ "a1.pdf": "pdf" });

      // Act
      const entries = await withClockRunning(
        collectFiles({ container, out, waitSeconds: 12, publications: [{ id: "civil", artefactId: "a1", expectedKinds: ["pdf", "excel"] }] })
      );

      // Assert
      expect(entries.map((entry) => entry.kind)).toEqual(["pdf"]);
    });

    it("should wait the whole time and download nothing when a publication never gets files", async () => {
      // Arrange
      const out = await mkdtemp(path.join(tmpdir(), "collect-"));
      vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
      let looks = 0;
      let downloads = 0;
      const container: BlobContainer = {
        ...memoryContainer({}),
        size: async () => {
          looks++;
          return null;
        },
        download: async () => {
          downloads++;
          return null;
        }
      };

      // Act
      const entries = await withClockRunning(collectFiles({ container, out, waitSeconds: 12, publications: [{ id: "sjp", artefactId: "a2" }] }));

      // Assert
      expect(entries).toEqual([]);
      // One look at each of the three kinds, initially and after each of three polls
      expect(looks).toBe(12);
      expect(downloads).toBe(0);
    });
  });
});
