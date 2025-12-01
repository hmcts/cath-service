import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveUploadedFile } from "./file-storage.js";

const TEST_ARTEFACT_ID = "test-artefact-123";
const TEST_FILE_NAME = "test-hearing-list.csv";
const TEST_FILE_EXTENSION = ".csv";
const TEST_FILE_CONTENT = Buffer.from("Test,File,Content\n1,2,3");
// Match the same path calculation as the implementation (from libs/admin-pages/src/manual-upload/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const TEST_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
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
});
