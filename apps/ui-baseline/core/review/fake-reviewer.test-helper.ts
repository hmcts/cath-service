import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

// A stand-in for the child process spawn() starts for a reviewer, for tests that mock
// node:child_process: it takes the prompt on stdin, then prints what it is given and exits with its
// status, or fails to start with error. Imported only by tests.
export interface FakeReviewerRun {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
}

export interface FakeReviewer extends EventEmitter {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: () => void;
  // What the reviewer was given on stdin, once it has been sent
  input: string;
}

export function fakeReviewer(run: FakeReviewerRun = {}): FakeReviewer {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: () => undefined,
    input: ""
  });
  child.stdin.setEncoding("utf-8");
  child.stdin.on("data", (chunk: string) => {
    child.input += chunk;
  });
  child.stdin.on("end", () => {
    if (run.error) {
      child.emit("error", run.error);
      return;
    }
    child.stdout.end(run.stdout ?? "");
    child.stderr.end(run.stderr ?? "");
    setImmediate(() => child.emit("close", run.status ?? 0));
  });
  return child;
}
