import { spawnSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readReviewerOutput, runReviewer } from "./reviewer-command.js";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

const envelope = (fields: Record<string, unknown>) => JSON.stringify({ type: "result", subtype: "success", is_error: false, num_turns: 1, ...fields });

describe("readReviewerOutput", () => {
  it("should answer with the structured output when Claude Code finished successfully", () => {
    // Act
    const answer = readReviewerOutput(envelope({ num_turns: 4, result: "ignored", structured_output: { verdicts: [] } }));

    // Assert
    expect(answer).toEqual({ outcome: "answered", turns: 4, json: { verdicts: [] } });
  });

  it("should read JSON from the result text when there is no structured output", () => {
    // Act
    const answer = readReviewerOutput(envelope({ result: 'Here:\n{"verdicts":[{"id":"f1"}]}\n' }));

    // Assert
    expect(answer).toEqual({ outcome: "answered", turns: 1, json: { verdicts: [{ id: "f1" }] } });
  });

  it("should report the turn limit as an outcome of its own rather than an answer", () => {
    // Act
    const answer = readReviewerOutput(envelope({ subtype: "error_max_turns", is_error: true, num_turns: 15 }));

    // Assert
    expect(answer).toEqual({ outcome: "turn-limit", turns: 15 });
  });

  it("should throw when the result is an error, even with a success subtype", () => {
    // Act
    const read = () => readReviewerOutput(envelope({ is_error: true, result: "AWS authentication failed" }));

    // Assert
    expect(read).toThrow("reviewer stopped (success, is_error): AWS authentication failed");
  });

  it("should throw when the result has any other error subtype", () => {
    // Act
    const read = () => readReviewerOutput(envelope({ subtype: "error_during_execution", is_error: true }));

    // Assert
    expect(read).toThrow("reviewer stopped (error_during_execution, is_error)");
  });

  it("should answer with plain JSON, or JSON inside prose, from a reviewer that is not Claude Code", () => {
    // Act
    const plain = readReviewerOutput('{"verdicts":[]}');
    const wrapped = readReviewerOutput('Sure.\n{"verdicts":[]}\nDone.');

    // Assert
    expect(plain).toEqual({ outcome: "answered", json: { verdicts: [] } });
    expect(wrapped).toEqual({ outcome: "answered", json: { verdicts: [] } });
  });

  it("should throw when the reviewer answered with no JSON at all", () => {
    // Act
    const read = () => readReviewerOutput("I could not decide");

    // Assert
    expect(read).toThrow("reviewer answered without JSON: I could not decide");
  });
});

describe("runReviewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass the prompt on stdin and read what the reviewer printed", () => {
    // Arrange
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '{"verdicts":[]}', stderr: "" } as never);

    // Act
    const answer = runReviewer(["my-llm", "--json"], "the prompt");

    // Assert
    expect(spawnSync).toHaveBeenCalledWith("my-llm", ["--json"], expect.objectContaining({ input: "the prompt", encoding: "utf-8" }));
    expect(answer).toEqual({ outcome: "answered", json: { verdicts: [] } });
  });

  it("should throw with the reviewer's error when it exits non-zero or cannot start", () => {
    // Arrange
    vi.mocked(spawnSync)
      .mockReturnValueOnce({ status: 2, stdout: "", stderr: "not logged in" } as never)
      .mockReturnValueOnce({ status: null, stdout: "", stderr: "", error: new Error("spawn claude ENOENT") } as never);

    // Act
    const failed = () => runReviewer(["claude"], "p");
    const missing = () => runReviewer(["claude"], "p");

    // Assert
    expect(failed).toThrow('reviewer "claude" failed (2): not logged in');
    expect(missing).toThrow('reviewer "claude" failed (null): Error: spawn claude ENOENT');
  });
});
