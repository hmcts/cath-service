import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteUploadedFile, getUploadedFile, saveUploadedFile } from "./file-storage.js";

const TEST_ARTEFACT_ID = "test-artefact-123";
const TEST_FILE_NAME = "test-hearing-list.csv";
const TEST_FILE_EXTENSION = ".csv";
const TEST_FILE_CONTENT = Buffer.from("Test,File,Content\n1,2,3");
const TEST_STORAGE_BASE = path.join(process.cwd(), "storage", "temp", "uploads");
const TEST_FILE_PATH = path.join(TEST_STORAGE_BASE, `${TEST_ARTEFACT_ID}${TEST_FILE_EXTENSION}`);

describe("file-storage", () => {
  beforeEach(async () => {
    // Clean up any existing test files
    try {
      await fs.rm(TEST_FILE_PATH, { force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test files after each test
    try {
      await fs.rm(TEST_FILE_PATH, { force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe("saveUploadedFile", () => {
    it("should save file with artefactId as filename", async () => {
      await saveUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_NAME, TEST_FILE_CONTENT);

      const fileExists = await fs
        .access(TEST_FILE_PATH)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const savedContent = await fs.readFile(TEST_FILE_PATH);
      expect(savedContent.toString()).toBe(TEST_FILE_CONTENT.toString());
    });

    it("should extract file extension from original filename", async () => {
      await saveUploadedFile(TEST_ARTEFACT_ID, "document.pdf", TEST_FILE_CONTENT);

      const pdfPath = path.join(TEST_STORAGE_BASE, `${TEST_ARTEFACT_ID}.pdf`);
      const fileExists = await fs
        .access(pdfPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Cleanup
      await fs.rm(pdfPath, { force: true });
    });
  });

  describe("getUploadedFile", () => {
    it("should retrieve saved file content", async () => {
      await saveUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_NAME, TEST_FILE_CONTENT);

      const retrievedContent = await getUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_EXTENSION);

      expect(retrievedContent.toString()).toBe(TEST_FILE_CONTENT.toString());
    });

    it("should throw error if file does not exist", async () => {
      await expect(getUploadedFile("nonexistent-id", ".csv")).rejects.toThrow();
    });
  });

  describe("deleteUploadedFile", () => {
    it("should delete file", async () => {
      await saveUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_NAME, TEST_FILE_CONTENT);

      await deleteUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_EXTENSION);

      const fileExists = await fs
        .access(TEST_FILE_PATH)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it("should handle missing file gracefully", async () => {
      await expect(deleteUploadedFile("nonexistent-id", ".csv")).rejects.toThrow();
    });
  });
});
