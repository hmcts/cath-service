import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// How far a run has got, written to a JSON file as it goes for the hosted check's run page to show.
// Every stage the run could have is listed from the start, and one it will not need is marked as
// such as soon as that is known, so the file says what is left as well as what is done. The file is
// replaced whole on each change, so a reader never sees it half written.
export function createProgress(file: string, stages: readonly StageDefinition[]): Progress {
  let state: ProgressFile = { updatedAt: now(), stages: stages.map(({ id, label }) => ({ id, label, status: "pending" })) };
  mkdirSync(path.dirname(file), { recursive: true });

  const write = () => {
    writeFileSync(`${file}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(`${file}.tmp`, file);
  };
  const update = (id: string, change: (stage: StageProgress) => StageProgress) => {
    if (!state.stages.some((stage) => stage.id === id)) throw new Error(`no stage ${id} in the progress of this run`);
    state = { updatedAt: now(), stages: state.stages.map((stage) => (stage.id === id ? change(stage) : stage)) };
    write();
  };

  write();
  return {
    start: (id, total) => update(id, (stage) => ({ ...stage, status: "running", startedAt: now(), ...(total === undefined ? {} : { done: 0, total }) })),
    advance: (id, done) => update(id, (stage) => ({ ...stage, done })),
    complete: (id) => update(id, (stage) => ({ ...stage, status: "done", finishedAt: now(), ...(stage.total === undefined ? {} : { done: stage.total }) })),
    skip: (id, reason) => update(id, (stage) => ({ ...stage, status: "skipped", reason })),
    // Whatever has not started by the end was not needed
    end: () => {
      state = {
        updatedAt: now(),
        stages: state.stages.map((stage) => (stage.status === "pending" ? { ...stage, status: "skipped", reason: stage.reason ?? "not needed" } : stage))
      };
      write();
    }
  };
}

function now(): string {
  return new Date().toISOString();
}

export interface StageDefinition {
  id: string;
  label: string;
}

export interface StageProgress extends StageDefinition {
  status: "pending" | "running" | "done" | "skipped";
  // Items done out of the stage's total, for a stage that counts them (captures, journey runs)
  done?: number;
  total?: number;
  startedAt?: string;
  finishedAt?: string;
  // Why a skipped stage was not needed
  reason?: string;
}

export interface ProgressFile {
  updatedAt: string;
  stages: StageProgress[];
}

export interface Progress {
  start(id: string, total?: number): void;
  advance(id: string, done: number): void;
  complete(id: string): void;
  skip(id: string, reason: string): void;
  end(): void;
}
