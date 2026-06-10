import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveExcelFile } from "./file-storage-service.js";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined)
  }
}));

describe("saveExcelFile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create the storage directory and write the file", async () => {
    const buffer = Buffer.from("test data");

    await saveExcelFile("test-artefact-123", buffer);

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining(path.join("storage", "temp", "uploads")), { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("test-artefact-123.xlsx"), buffer);
  });

  it("should save file with correct .xlsx extension", async () => {
    const buffer = Buffer.from("excel content");

    await saveExcelFile("my-artefact", buffer);

    const writePath = vi.mocked(fs.writeFile).mock.calls[0][0] as string;
    expect(writePath).toMatch(/my-artefact\.xlsx$/);
  });
});
