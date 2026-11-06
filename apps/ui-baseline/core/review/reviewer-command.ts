import { spawnSync } from "node:child_process";

// Runs a reviewer with the prompt on stdin and works out how it ended. Claude Code in print mode
// with --output-format json prints one result envelope, and the envelope, not the exit code or the
// text, says whether the model finished: subtype "success" with is_error false is an answer,
// "error_max_turns" is the turn limit (a backstop, not an answer), and anything else failed. An
// auth failure, for one, exits 0 with subtype "success" and is_error true, its message in `result`.
// A reviewer that is not Claude Code may print its JSON answer on its own, or inside other text.
export function runReviewer(command: string[], prompt: string): ReviewerAnswer {
  const [program, ...args] = command;
  const run = spawnSync(program, args, { input: prompt, encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`reviewer "${program}" failed (${run.status}): ${(run.stderr || run.stdout || String(run.error ?? "")).slice(0, 500)}`);
  return readReviewerOutput(run.stdout);
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

interface ResultEnvelope {
  type: "result";
  subtype: string;
  is_error?: boolean;
  num_turns?: number;
  result?: unknown;
  structured_output?: unknown;
}
