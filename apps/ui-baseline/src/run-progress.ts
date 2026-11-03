import type { ProgressFile, StageProgress } from "../progress.js";
import type { RunRecord } from "./runs.js";

// What the run page shows of a check's progress (progress.json, written by check.ts as it goes):
// each stage with how far it got, and how many of the stages it needs are done.
const STATUS = {
  pending: { text: "Not started", colour: "grey" },
  running: { text: "In progress", colour: "blue" },
  done: { text: "Done", colour: "green" },
  skipped: { text: "Not needed", colour: "grey" }
} as const;
// A stage still going when its run has ended was cut short with it
const STOPPED = { text: "Stopped", colour: "red" } as const;

export function describeProgress(progress: ProgressFile, runStatus: RunRecord["status"]): RunProgress {
  const ended = runStatus === "finished" || runStatus === "failed";
  const needed = progress.stages.filter((stage) => stage.status !== "skipped");
  return {
    done: needed.filter((stage) => stage.status === "done").length,
    needed: needed.length,
    stages: progress.stages.map((stage) => ({
      label: stage.label,
      status: ended && stage.status === "running" ? STOPPED : STATUS[stage.status],
      detail: detailOf(stage)
    }))
  };
}

function detailOf(stage: StageProgress): string {
  if (stage.status === "skipped") return stage.reason ?? "";
  const count = stage.total === undefined ? "" : `${stage.done ?? 0} of ${stage.total}`;
  const took = stage.status === "done" && stage.startedAt && stage.finishedAt ? `took ${duration(stage.startedAt, stage.finishedAt)}` : "";
  return [count, took].filter(Boolean).join(", ");
}

function duration(from: string, to: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export interface RunProgress {
  done: number;
  needed: number;
  stages: { label: string; status: { text: string; colour: string }; detail: string }[];
}
