import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveIdProofFile } from "./storage.js";

vi.mock("node:fs/promises");

describe("saveIdProofFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should save file with correct naming convention", async () => {
    const applicationId = "test-uuid-123";
    const originalFileName = "passport.jpg";
    const fileBuffer = Buffer.from("test file content");

    await saveIdProofFile(applicationId, originalFileName, fileBuffer);

    expect(fs.mkdir).toHaveBeenCalledWith(path.join(process.cwd(), "storage", "temp", "files"), { recursive: true });

    expect(fs.writeFile).toHaveBeenCalledWith(path.join(process.cwd(), "storage", "temp", "files", "test-uuid-123.jpg"), fileBuffer);
  });

  it("should preserve file extension from original filename", async () => {
    const applicationId = "test-uuid-456";
    const originalFileName = "id-card.png";
    const fileBuffer = Buffer.from("test image");

    await saveIdProofFile(applicationId, originalFileName, fileBuffer);

    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("test-uuid-456.png"), fileBuffer);
  });

  it("should handle uppercase extensions", async () => {
    const applicationId = "test-uuid-789";
    const originalFileName = "document.PDF";
    const fileBuffer = Buffer.from("test pdf");

    await saveIdProofFile(applicationId, originalFileName, fileBuffer);

    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("test-uuid-789.pdf"), fileBuffer);
  });

  it("should create directory if it does not exist", async () => {
    const applicationId = "test-uuid-101";
    const originalFileName = "press-card.jpeg";
    const fileBuffer = Buffer.from("test jpeg");

    await saveIdProofFile(applicationId, originalFileName, fileBuffer);

    expect(fs.mkdir).toHaveBeenCalledWith(path.join(process.cwd(), "storage", "temp", "files"), { recursive: true });
  });
});
