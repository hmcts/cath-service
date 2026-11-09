import { spawn } from "node:child_process";

// Reviewers run at once: each is a model call that mostly waits, so a review of many batches, or an
// investigation of many items, takes about a quarter of the time it did one after another, while
// staying well inside a Claude Code sign-in's rate limits
export const REVIEWERS_AT_ONCE = 4;
// What a reviewer may print before it is stopped, as spawnSync's maxBuffer did
const MAX_OUTPUT = 32 * 1024 * 1024;

// Runs a reviewer with the prompt on stdin and works out how it ended. Claude Code in print mode
// with --output-format json prints one result envelope, and the envelope, not the exit code or the
// text, says whether the model finished: subtype "success" with is_error false is an answer,
// "error_max_turns" is the turn limit (a backstop, not an answer), and anything else failed. An
// auth failure, for one, exits 0 with subtype "success" and is_error true, its message in `result`.
// A reviewer that is not Claude Code may print its JSON answer on its own, or inside other text.
export async function runReviewer(command: string[], prompt: string): Promise<ReviewerAnswer> {
  const [program, ...args] = command;
  const run = await runProgram(program, args, prompt);
  if (run.status !== 0) throw new Error(`reviewer "${program}" failed (${run.status}): ${(run.stderr || run.stdout || String(run.error ?? "")).slice(0, 500)}`);
  return readReviewerOutput(run.stdout);
}

// Each item through run, up to REVIEWERS_AT_ONCE at a time, with the answers in the items' order
export async function forEachReviewer<T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const answers: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < items.length; index = next++) answers[index] = await run(items[index]);
  };
  await Promise.all(Array.from({ length: Math.min(REVIEWERS_AT_ONCE, items.length) }, worker));
  return answers;
}

export function readReviewerOutput(stdout: string): ReviewerAnswer {
  const envelope = parseJson(stdout.trim());
  if (!isResultEnvelope(envelope)) return { outcome: "answered", json: envelope ?? jsonWithin(stdout) };
  if (envelope.subtype === "error_max_turns") return { outcome: "turn-limit", turns: envelope.num_turns };
  if (envelope.is_error || envelope.subtype !== "success") {
    throw new Error(`reviewer stopped (${envelope.subtype}${envelope.is_error ? ", is_error" : ""}): ${String(envelope.result ?? "").slice(0, 300)}`);
  }
  return { outcome: "answered", turns: envelope.num_turns, json: envelope.structured_output ?? jsonWithin(String(envelope.result ?? "")) };
}

// The program run with input on stdin, as spawnSync gives it back, without holding up the event loop
function runProgram(program: string, args: string[], input: string): Promise<ProgramRun> {
  return new Promise((resolve) => {
    const child = spawn(program, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let error: Error | undefined;
    let settled = false;
    const finish = (status: number | null) => {
      if (settled) return;
      settled = true;
      resolve({ status: error ? null : status, stdout, stderr, error });
    };
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > MAX_OUTPUT) {
        error = new Error(`printed more than ${MAX_OUTPUT} characters`);
        child.kill();
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    // A program that cannot start is reported (it may never close), as is one that exits before
    // reading its prompt
    child.on("error", (spawnError) => {
      error = spawnError;
      finish(null);
    });
    child.stdin.on("error", () => undefined);
    child.on("close", finish);
    child.stdin.end(input);
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isResultEnvelope(value: unknown): value is ResultEnvelope {
  return typeof value === "object" && value !== null && (value as ResultEnvelope).type === "result" && typeof (value as ResultEnvelope).subtype === "string";
}

// The outermost {...} in text that has prose around it
function jsonWithin(text: string): unknown {
  const json = parseJson(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  if (json === undefined) throw new Error(`reviewer answered without JSON: ${text.trim().slice(0, 200)}`);
  return json;
}

export type ReviewerAnswer = { outcome: "answered"; json: unknown; turns?: number } | { outcome: "turn-limit"; turns?: number };

interface ProgramRun {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

interface ResultEnvelope {
  type: "result";
  subtype: string;
  is_error?: boolean;
  num_turns?: number;
  result?: unknown;
  structured_output?: unknown;
}
