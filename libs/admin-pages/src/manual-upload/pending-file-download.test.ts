import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPendingFile } from "./pending-file-download.js";
import { getPendingFile } from "./storage.js";

vi.mock("./storage.js", () => ({
  getPendingFile: vi.fn()
}));

function createResponse() {
  const res = { status: vi.fn(), end: vi.fn(), set: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("sendPendingFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send the kept file with its content type and no caching", async () => {
    // Arrange
    const res = createResponse();
    const buffer = Buffer.from("{}");
    vi.mocked(getPendingFile).mockResolvedValue({ buffer, originalname: "list.json", mimetype: "application/json", size: buffer.length });

    // Act
    await sendPendingFile(res as unknown as Response, "manual-upload", { id: "abc", fileName: "list.json" });

    // Assert
    expect(getPendingFile).toHaveBeenCalledWith("manual-upload", "abc");
    expect(res.set).toHaveBeenCalledWith({ "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it("should return 404 when the session has no kept file", async () => {
    // Arrange
    const res = createResponse();

    // Act
    await sendPendingFile(res as unknown as Response, "manual-upload", undefined);

    // Assert
    expect(getPendingFile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should return 404 when the kept file has expired", async () => {
    // Arrange
    const res = createResponse();
    vi.mocked(getPendingFile).mockResolvedValue(null);

    // Act
    await sendPendingFile(res as unknown as Response, "non-strategic-upload", { id: "gone", fileName: "list.xlsx" });

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).not.toHaveBeenCalled();
  });
});
