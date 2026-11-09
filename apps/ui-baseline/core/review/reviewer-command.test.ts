import { spawn } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeReviewer, fakeReviewer } from "./fake-reviewer.test-helper.js";
import { forEachReviewer, REVIEWERS_AT_ONCE, readReviewerOutput, runReviewer } from "./reviewer-command.js";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

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

  it("should pass the prompt on stdin and read what the reviewer printed", async () => {
    // Arrange
    vi.mocked(spawn).mockImplementation((() => fakeReviewer({ stdout: '{"verdicts":[]}' })) as never);

    // Act
    const answer = await runReviewer(["my-llm", "--json"], "the prompt");

    // Assert
    expect(spawn).toHaveBeenCalledWith("my-llm", ["--json"], { stdio: ["pipe", "pipe", "pipe"] });
    expect((vi.mocked(spawn).mock.results[0].value as FakeReviewer).input).toBe("the prompt");
    expect(answer).toEqual({ outcome: "answered", json: { verdicts: [] } });
  });

  it("should throw with the reviewer's error when it exits non-zero", async () => {
    // Arrange
    vi.mocked(spawn).mockImplementation((() => fakeReviewer({ status: 2, stderr: "not logged in" })) as never);

    // Act
    const failed = runReviewer(["claude"], "p");

    // Assert
    await expect(failed).rejects.toThrow('reviewer "claude" failed (2): not logged in');
  });

  it("should throw with the spawn error when the reviewer cannot start", async () => {
    // Arrange
    vi.mocked(spawn).mockImplementation((() => fakeReviewer({ error: new Error("spawn claude ENOENT") })) as never);

    // Act
    const missing = runReviewer(["claude"], "p");

    // Assert
    await expect(missing).rejects.toThrow('reviewer "claude" failed (null): Error: spawn claude ENOENT');
  });
});

describe("forEachReviewer", () => {
  it("should run no more than REVIEWERS_AT_ONCE at a time and answer in the items' order", async () => {
    // Arrange
    const items = Array.from({ length: 10 }, (_, i) => i);
    let running = 0;
    let peak = 0;

    // Act
    const answers = await forEachReviewer(items, async (item) => {
      running++;
      peak = Math.max(peak, running);
      // Later items finish first, so the order is not just the order they finished in
      await new Promise((resolve) => setTimeout(resolve, 20 - item));
      running--;
      return `answer ${item}`;
    });

    // Assert
    expect(peak).toBe(REVIEWERS_AT_ONCE);
    expect(answers).toEqual(items.map((item) => `answer ${item}`));
  });

  it("should answer with nothing when there are no items", async () => {
    // Act
    const answers = await forEachReviewer([], async () => "never");

    // Assert
    expect(answers).toEqual([]);
  });
});
