import { describe, expect, it } from "vitest";
import type { ProgressFile } from "../progress.js";
import { describeProgress } from "./run-progress.js";

const PROGRESS: ProgressFile = {
  updatedAt: "2026-11-03T12:10:00Z",
  stages: [
    { id: "seed", label: "Seeding CaTH", status: "done", startedAt: "2026-11-03T12:00:00Z", finishedAt: "2026-11-03T12:00:42Z" },
    { id: "sign-in", label: "Signing in to CaTH", status: "skipped", reason: "no page in scope needs it" },
    {
      id: "capture-lists",
      label: "Capturing list pages",
      status: "done",
      done: 472,
      total: 472,
      startedAt: "2026-11-03T12:01:00Z",
      finishedAt: "2026-11-03T12:09:30Z"
    },
    { id: "capture-pages", label: "Capturing other pages", status: "running", done: 120, total: 374, startedAt: "2026-11-03T12:09:30Z" },
    { id: "compare", label: "Comparing with pip", status: "pending" }
  ]
};

describe("describeProgress", () => {
  it("should count the stages done out of those the run needs", () => {
    // Act
    const progress = describeProgress(PROGRESS, "running");

    // Assert
    expect(progress.done).toBe(2);
    expect(progress.needed).toBe(4);
  });

  it("should say how far each stage got, and why a stage was not needed", () => {
    // Act
    const { stages } = describeProgress(PROGRESS, "running");

    // Assert
    expect(stages).toEqual([
      { label: "Seeding CaTH", status: { text: "Done", colour: "green" }, detail: "took 42 seconds" },
      { label: "Signing in to CaTH", status: { text: "Not needed", colour: "grey" }, detail: "no page in scope needs it" },
      { label: "Capturing list pages", status: { text: "Done", colour: "green" }, detail: "472 of 472, took 9 minutes" },
      { label: "Capturing other pages", status: { text: "In progress", colour: "blue" }, detail: "120 of 374" },
      { label: "Comparing with pip", status: { text: "Not started", colour: "grey" }, detail: "" }
    ]);
  });

  it("should show the stage a failed run was on as stopped", () => {
    // Act
    const { stages } = describeProgress(PROGRESS, "failed");

    // Assert
    expect(stages[3]).toEqual({ label: "Capturing other pages", status: { text: "Stopped", colour: "red" }, detail: "120 of 374" });
    expect(stages[4].status).toEqual({ text: "Not started", colour: "grey" });
  });
});
