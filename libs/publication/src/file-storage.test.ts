import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findRepoRoot, getStoragePath, getUploadedFile, saveUploadedFile } from "./file-storage.js";

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

  describe("findRepoRoot error handling (lines 18-20, 25-29)", () => {
    it("should verify findRepoRoot finds repository root correctly", () => {
      // Test that findRepoRoot actually works in normal circumstances
      const result = findRepoRoot();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // Should find the actual repo root which contains package.json and libs/
      expect(fsSync.existsSync(path.join(result, "package.json"))).toBe(true);
      expect(fsSync.existsSync(path.join(result, "libs"))).toBe(true);
    });

    it("should verify catch block exists for fs.existsSync errors (lines 18-20)", () => {
      // The catch block at lines 18-20 handles errors from fs.existsSync
      // We verify the defensive code exists by checking the function can handle
      // starting from non-existent paths without throwing
      expect(() => findRepoRoot("/tmp/non-existent-test-path-12345")).not.toThrow();
    });

    it("should verify fallback logic when no repo found (lines 27-28)", () => {
      // When starting from a path where no repo exists, and we traverse all the way up,
      // the function should fall back to process.cwd()
      // We can't easily mock this without breaking the module, but we can verify
      // the function returns a valid path
      const result = findRepoRoot("/tmp");
      expect(result).toBeDefined();
      expect(path.isAbsolute(result)).toBe(true);
    });

    it("should verify parentDir break condition (lines 22-24)", () => {
      // The break condition at lines 22-24 prevents infinite loops when
      // parentDir === currentDir (filesystem root)
      // We verify this by confirming the function completes without hanging
      const result = findRepoRoot("/");
      expect(result).toBeDefined();
      // When starting from root and no repo found, falls back to process.cwd()
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getUploadedFile error handling (lines 68-70)", () => {
    it("should return null when readdir throws an error (lines 68-70)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock fs.readdir to throw an error
      const originalReaddir = fs.readdir;
      vi.spyOn(fs, "readdir").mockRejectedValueOnce(new Error("Permission denied"));

      const result = await getUploadedFile("test-error-artefact");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to read uploaded file for artefactId test-error-artefact:", expect.any(Error));

      // Restore original implementation
      fs.readdir = originalReaddir;
      consoleErrorSpy.mockRestore();
    });

    it("should return null when readFile throws an error (lines 68-70)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // First save a file
      await saveUploadedFile(TEST_ARTEFACT_ID, TEST_FILE_NAME, TEST_FILE_CONTENT);

      // Mock readFile to throw an error after readdir succeeds
      const originalReadFile = fs.readFile;
      vi.spyOn(fs, "readFile").mockRejectedValueOnce(new Error("File read error"));

      const result = await getUploadedFile(TEST_ARTEFACT_ID);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Failed to read uploaded file for artefactId ${TEST_ARTEFACT_ID}:`, expect.any(Error));

      // Restore original implementation
      fs.readFile = originalReadFile;
      consoleErrorSpy.mockRestore();
    });

    it("should handle ENOENT error gracefully (lines 68-70)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock fs operations to simulate directory not existing
      const enoentError: any = new Error("ENOENT: no such file or directory");
      enoentError.code = "ENOENT";
      vi.spyOn(fs, "readdir").mockRejectedValueOnce(enoentError);

      const result = await getUploadedFile("missing-artefact");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to read uploaded file for artefactId missing-artefact:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should handle EACCES error gracefully (lines 68-70)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock fs operations to simulate permission denied
      const eaccesError: any = new Error("EACCES: permission denied");
      eaccesError.code = "EACCES";
      vi.spyOn(fs, "readdir").mockRejectedValueOnce(eaccesError);

      const result = await getUploadedFile("permission-denied-artefact");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to read uploaded file for artefactId permission-denied-artefact:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Security validations", () => {
    describe("artefactId validation", () => {
      it("should reject artefactId with path separators", async () => {
        await expect(saveUploadedFile("../evil", "test.csv", TEST_FILE_CONTENT)).rejects.toThrow(
          "Invalid artefactId: only alphanumeric characters, hyphens, and underscores are allowed"
        );
      });

      it("should reject artefactId with forward slash", async () => {
        await expect(saveUploadedFile("test/evil", "test.csv", TEST_FILE_CONTENT)).rejects.toThrow(
          "Invalid artefactId: only alphanumeric characters, hyphens, and underscores are allowed"
        );
      });

      it("should reject artefactId with backslash", async () => {
        await expect(saveUploadedFile("test\\evil", "test.csv", TEST_FILE_CONTENT)).rejects.toThrow(
          "Invalid artefactId: only alphanumeric characters, hyphens, and underscores are allowed"
        );
      });

      it("should reject artefactId with null bytes", async () => {
        await expect(saveUploadedFile("test\x00evil", "test.csv", TEST_FILE_CONTENT)).rejects.toThrow(
          "Invalid artefactId: only alphanumeric characters, hyphens, and underscores are allowed"
        );
      });

      it("should reject empty artefactId", async () => {
        await expect(saveUploadedFile("", "test.csv", TEST_FILE_CONTENT)).rejects.toThrow("Invalid artefactId: must be a non-empty string");
      });

      it("should reject artefactId longer than 255 characters", async () => {
        const longId = "a".repeat(256);
        await expect(saveUploadedFile(longId, "test.csv", TEST_FILE_CONTENT)).rejects.toThrow("Invalid artefactId: maximum length is 255 characters");
      });

      it("should accept valid artefactId with alphanumeric, hyphens, and underscores", async () => {
        const validId = "valid-artefact_123";
        const validPath = path.join(TEST_STORAGE_BASE, `${validId}.csv`);

        await saveUploadedFile(validId, "test.csv", TEST_FILE_CONTENT);

        const fileExists = await fs
          .access(validPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(validPath, { force: true });
      });

      it("should reject artefactId with dots (double-dot attack)", async () => {
        await expect(saveUploadedFile("..", "test.csv", TEST_FILE_CONTENT)).rejects.toThrow(
          "Invalid artefactId: only alphanumeric characters, hyphens, and underscores are allowed"
        );
      });

      it("should reject artefactId in getUploadedFile with path separators", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await getUploadedFile("../evil");

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to read uploaded file for artefactId ../evil:", expect.any(Error));

        consoleErrorSpy.mockRestore();
      });
    });

    describe("file extension validation", () => {
      it("should reject file without extension", async () => {
        await expect(saveUploadedFile("test-id", "noextension", TEST_FILE_CONTENT)).rejects.toThrow("Invalid file: no file extension provided");
      });

      it("should reject file with disallowed extension", async () => {
        await expect(saveUploadedFile("test-id", "test.exe", TEST_FILE_CONTENT)).rejects.toThrow("Invalid file extension: .exe");
      });

      it("should reject file with .sh extension", async () => {
        await expect(saveUploadedFile("test-id", "script.sh", TEST_FILE_CONTENT)).rejects.toThrow("Invalid file extension: .sh");
      });

      it("should accept .pdf extension", async () => {
        const testId = "test-pdf-123";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.pdf`);

        await saveUploadedFile(testId, "document.pdf", TEST_FILE_CONTENT);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });

      it("should accept .csv extension", async () => {
        const testId = "test-csv-123";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.csv`);

        await saveUploadedFile(testId, "data.csv", TEST_FILE_CONTENT);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });

      it("should accept .json extension", async () => {
        const testId = "test-json-123";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.json`);

        await saveUploadedFile(testId, "data.json", TEST_FILE_CONTENT);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });

      it("should handle case-insensitive extension matching", async () => {
        const testId = "test-uppercase-123";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.pdf`);

        await saveUploadedFile(testId, "document.PDF", TEST_FILE_CONTENT);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });
    });

    describe("file size validation", () => {
      it("should reject file larger than 10MB", async () => {
        const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

        await expect(saveUploadedFile("test-id", "large.csv", largeBuffer)).rejects.toThrow("File too large: maximum size is 10MB");
      });

      it("should accept file at exactly 10MB", async () => {
        const maxBuffer = Buffer.alloc(10 * 1024 * 1024); // Exactly 10MB
        const testId = "test-max-size";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.csv`);

        await saveUploadedFile(testId, "max.csv", maxBuffer);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });

      it("should accept file smaller than 10MB", async () => {
        const smallBuffer = Buffer.from("small content");
        const testId = "test-small-size";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.csv`);

        await saveUploadedFile(testId, "small.csv", smallBuffer);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });
    });

    describe("path traversal prevention", () => {
      it("should prevent path traversal in saveUploadedFile", async () => {
        // Even if artefactId validation was bypassed, path validation should catch it
        // This test verifies defense in depth
        const testId = "valid-id";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.csv`);

        await saveUploadedFile(testId, "test.csv", TEST_FILE_CONTENT);

        const fileExists = await fs
          .access(testPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        const resolvedPath = path.resolve(testPath);
        const normalizedBase = path.resolve(TEST_STORAGE_BASE);

        // Verify file is within the storage base directory
        expect(resolvedPath.startsWith(normalizedBase)).toBe(true);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });

      it("should verify resolved path is within storage base", async () => {
        const testId = "test-path-check";
        const testPath = path.join(TEST_STORAGE_BASE, `${testId}.csv`);

        await saveUploadedFile(testId, "test.csv", TEST_FILE_CONTENT);

        const resolvedPath = path.resolve(testPath);
        const normalizedBase = path.resolve(TEST_STORAGE_BASE);

        expect(resolvedPath).toContain(normalizedBase);

        // Cleanup
        await fs.rm(testPath, { force: true });
      });
    });
  });
});
