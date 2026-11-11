import { runMediaApplicationReport } from "@hmcts/media-reporting";
import { beforeEach, describe, expect, it, vi } from "vitest";
import mediaReporting from "./media-reporting.js";

vi.mock("@hmcts/media-reporting", () => ({
  runMediaApplicationReport: vi.fn()
}));

describe("media-reporting cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should run the media application report", async () => {
    // Arrange
    vi.mocked(runMediaApplicationReport).mockResolvedValue();

    // Act
    await mediaReporting();

    // Assert
    expect(runMediaApplicationReport).toHaveBeenCalledTimes(1);
  });

  it("should pass errors through unchanged", async () => {
    // Arrange
    const error = new Error("Report failed");
    vi.mocked(runMediaApplicationReport).mockRejectedValue(error);

    // Act & Assert
    await expect(mediaReporting()).rejects.toBe(error);
  });
});
