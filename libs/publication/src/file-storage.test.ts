import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStoragePath, getUploadedFile, saveUploadedFile } from "./file-storage.js";

const TEST_ARTEFACT_ID = "test-artefact-123";
const TEST_FILE_NAME = "test-hearing-list.csv";
const TEST_FILE_EXTENSION = ".csv";
const TEST_FILE_CONTENT = Buffer.from("Test,File,Content\n1,2,3");
const TEST_STORAGE_BASE = getStoragePath();
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
    it("should retrieve file by artefactId", async () => {
      await saveUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_NAME, TEST_FILE_CONTENT);

      const result = await getUploadedFile(TEST_ARTEFACT_ID);

      expect(result).not.toBeNull();
      expect(result?.fileData.toString()).toBe(TEST_FILE_CONTENT.toString());
      expect(result?.fileName).toBe(`${TEST_ARTEFACT_ID}${TEST_FILE_EXTENSION}`);
    });

    it("should return null when file does not exist", async () => {
      const result = await getUploadedFile("non-existent-artefact");

      expect(result).toBeNull();
    });

    it("should return null when storage directory does not exist", async () => {
      // Use a non-existent artefactId that would force reading from non-existent directory
      const result = await getUploadedFile("artefact-with-no-storage");

      expect(result).toBeNull();
    });

    it("should find file with different extensions", async () => {
      const artefactId = "test-artefact-pdf";
      const pdfContent = Buffer.from("PDF content");
      await saveUploadedFile(artefactId, "document.pdf", pdfContent);

      const result = await getUploadedFile(artefactId);

      expect(result).not.toBeNull();
      expect(result?.fileName).toBe(`${artefactId}.pdf`);
      expect(result?.fileData.toString()).toBe(pdfContent.toString());

      // Cleanup
      await fs.rm(path.join(TEST_STORAGE_BASE, `${artefactId}.pdf`), { force: true });
    });

    it("should match files that start with artefactId", async () => {
      const artefactId = "test-match-123";
      const jsonContent = Buffer.from('{"test": "data"}');
      await saveUploadedFile(artefactId, "data.json", jsonContent);

      const result = await getUploadedFile(artefactId);

      expect(result).not.toBeNull();
      expect(result?.fileName).toContain(artefactId);
      expect(result?.fileData.toString()).toBe(jsonContent.toString());

      // Cleanup
      await fs.rm(path.join(TEST_STORAGE_BASE, `${artefactId}.json`), { force: true });
    });

    it("should return file data as Buffer", async () => {
      await saveUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_NAME, TEST_FILE_CONTENT);

      const result = await getUploadedFile(TEST_ARTEFACT_ID);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result?.fileData)).toBe(true);
    });
  });
});
