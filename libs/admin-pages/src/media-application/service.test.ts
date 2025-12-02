import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_STATUS } from "./model.js";
import * as queries from "./queries.js";
import { approveApplication, deleteProofOfIdFile, rejectApplication } from "./service.js";

vi.mock("node:fs/promises");
vi.mock("./queries.js");

describe("media-application service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("approveApplication", () => {
    it("should approve application and delete file", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: "/tmp/file.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await approveApplication("1");

      expect(queries.getApplicationById).toHaveBeenCalledWith("1");
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.APPROVED);
      expect(fs.unlink).toHaveBeenCalledWith("/tmp/file.pdf");
    });

    it("should approve application without deleting file when path is null", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: null,
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });

      await approveApplication("1");

      expect(queries.updateApplicationStatus).toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should throw error when application not found", async () => {
      vi.mocked(queries.getApplicationById).mockResolvedValue(null);

      await expect(approveApplication("non-existent")).rejects.toThrow("Application not found");
    });

    it("should throw error when application already reviewed", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: "/tmp/file.pdf",
        status: APPLICATION_STATUS.APPROVED,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);

      await expect(approveApplication("1")).rejects.toThrow("Application has already been reviewed");
    });
  });

  describe("rejectApplication", () => {
    it("should reject application without deleting file", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: "/tmp/file.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.REJECTED
      });

      await rejectApplication("1");

      expect(queries.getApplicationById).toHaveBeenCalledWith("1");
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.REJECTED);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should throw error when application not found", async () => {
      vi.mocked(queries.getApplicationById).mockResolvedValue(null);

      await expect(rejectApplication("non-existent")).rejects.toThrow("Application not found");
    });

    it("should throw error when application already reviewed", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: "/tmp/file.pdf",
        status: APPLICATION_STATUS.APPROVED,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);

      await expect(rejectApplication("1")).rejects.toThrow("Application has already been reviewed");
    });
  });

  describe("deleteProofOfIdFile", () => {
    it("should delete file at valid path", async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await deleteProofOfIdFile("/tmp/file.pdf");

      expect(fs.unlink).toHaveBeenCalledWith("/tmp/file.pdf");
    });

    it("should throw error for path traversal attempt", async () => {
      await expect(deleteProofOfIdFile("/tmp/../etc/passwd")).rejects.toThrow("Invalid file path");
    });

    it("should not throw error when file does not exist", async () => {
      const error = new Error("File not found") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      vi.mocked(fs.unlink).mockRejectedValue(error);

      await expect(deleteProofOfIdFile("/tmp/non-existent.pdf")).resolves.not.toThrow();
    });

    it("should throw error for other file system errors", async () => {
      const error = new Error("Permission denied") as NodeJS.ErrnoException;
      error.code = "EACCES";
      vi.mocked(fs.unlink).mockRejectedValue(error);

      await expect(deleteProofOfIdFile("/tmp/file.pdf")).rejects.toThrow("Permission denied");
    });
  });
});
