import type { Session } from "express-session";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSession } from "./session-utils.js";

describe("saveSession", () => {
  let mockSession: Partial<Session>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {
      save: vi.fn()
    };
  });

  it("should resolve when session.save succeeds", async () => {
    // Arrange
    vi.mocked(mockSession.save).mockImplementation((callback) => {
      callback();
      return mockSession as Session;
    });

    // Act & Assert
    await expect(saveSession(mockSession as Session)).resolves.toBeUndefined();
    expect(mockSession.save).toHaveBeenCalledTimes(1);
  });

  it("should reject with error when session.save fails", async () => {
    // Arrange
    const testError = new Error("Save failed");
    vi.mocked(mockSession.save).mockImplementation((callback) => {
      callback(testError);
      return mockSession as Session;
    });

    // Act & Assert
    await expect(saveSession(mockSession as Session)).rejects.toThrow("Save failed");
    expect(mockSession.save).toHaveBeenCalledTimes(1);
  });
});
