import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createProgress, type ProgressFile } from "./progress.js";

const STAGES = [
  { id: "seed", label: "Seeding CaTH" },
  { id: "capture", label: "Capturing list pages" },
  { id: "review", label: "Reviewing differences" }
];

async function progressFile() {
  const file = path.join(await mkdtemp(path.join(tmpdir(), "progress-")), "check", "progress.json");
  const read = () => JSON.parse(readFileSync(file, "utf-8")) as ProgressFile;
  return { file, read };
}

describe("createProgress", () => {
  it("should list every stage as not started from the outset", async () => {
    // Arrange
    const { file, read } = await progressFile();

    // Act
    createProgress(file, STAGES);

    // Assert
    expect(read().stages).toEqual([
      { id: "seed", label: "Seeding CaTH", status: "pending" },
      { id: "capture", label: "Capturing list pages", status: "pending" },
      { id: "review", label: "Reviewing differences", status: "pending" }
    ]);
  });

  it("should count a stage's items from none to its total", async () => {
    // Arrange
    const { file, read } = await progressFile();
    const progress = createProgress(file, STAGES);

    // Act
    progress.start("capture", 10);
    const started = read().stages[1];
    progress.advance("capture", 4);
    const advanced = read().stages[1];
    progress.complete("capture");
    const completed = read().stages[1];

    // Assert
    expect(started).toMatchObject({ status: "running", done: 0, total: 10, startedAt: expect.any(String) });
    expect(advanced).toMatchObject({ status: "running", done: 4, total: 10 });
    expect(completed).toMatchObject({ status: "done", done: 10, total: 10, finishedAt: expect.any(String) });
  });

  it("should not give a count to a stage that has none", async () => {
    // Arrange
    const { file, read } = await progressFile();
    const progress = createProgress(file, STAGES);

    // Act
    progress.start("seed");
    progress.complete("seed");

    // Assert
    expect(read().stages[0]).not.toHaveProperty("done");
    expect(read().stages[0]).not.toHaveProperty("total");
    expect(read().stages[0].status).toBe("done");
  });

  it("should say why a stage is not needed", async () => {
    // Arrange
    const { file, read } = await progressFile();
    const progress = createProgress(file, STAGES);

    // Act
    progress.skip("review", "not asked for");

    // Assert
    expect(read().stages[2]).toMatchObject({ status: "skipped", reason: "not asked for" });
  });

  it("should mark the stages never started as not needed at the end, keeping the rest", async () => {
    // Arrange
    const { file, read } = await progressFile();
    const progress = createProgress(file, STAGES);
    progress.start("seed");
    progress.complete("seed");

    // Act
    progress.end();

    // Assert
    expect(read().stages.map((stage) => [stage.id, stage.status, stage.reason])).toEqual([
      ["seed", "done", undefined],
      ["capture", "skipped", "not needed"],
      ["review", "skipped", "not needed"]
    ]);
  });

  it("should leave no partly written file behind", async () => {
    // Arrange
    const { file } = await progressFile();
    const progress = createProgress(file, STAGES);

    // Act
    progress.start("capture", 2);

    // Assert
    expect(existsSync(`${file}.tmp`)).toBe(false);
  });

  it("should throw for a stage it does not have", async () => {
    // Arrange
    const { file } = await progressFile();
    const progress = createProgress(file, STAGES);

    // Act
    const act = () => progress.start("journeys");

    // Assert
    expect(act).toThrow("no stage journeys in the progress of this run");
  });
});
