import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_STATUS } from "./model.js";
import * as queries from "./queries.js";
import { approveApplication, deleteProofOfIdFile, rejectApplication, splitName } from "./service.js";

vi.mock("node:fs/promises");
vi.mock("./queries.js");

const mockCheckUserExists = vi.fn();
const mockCreateMediaUser = vi.fn();

vi.mock("@hmcts/auth", () => ({
  checkUserExists: (...args: unknown[]) => mockCheckUserExists(...args),
  createMediaUser: (...args: unknown[]) => mockCreateMediaUser(...args)
}));

const mockCreateUser = vi.fn();

vi.mock("@hmcts/account/repository/query", () => ({
  createUser: (...args: unknown[]) => mockCreateUser(...args)
}));

const MOCK_ACCESS_TOKEN = "test-access-token";

describe("media-application service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUser.mockResolvedValue({ userId: "local-user-id" });
  });

  describe("approveApplication", () => {
    it("should create Azure AD user and approve application for new users", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/tmp/file.pdf",
        proofOfIdOriginalName: "test-file.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      mockCheckUserExists.mockResolvedValue(false);
      mockCreateMediaUser.mockResolvedValue({ azureAdUserId: "azure-user-123" });
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result).toEqual({ isNewUser: true });
      expect(mockCheckUserExists).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, "john@example.com");
      expect(mockCreateMediaUser).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, {
        email: "john@example.com",
        displayName: "John Doe",
        givenName: "John",
        surname: "Doe"
      });
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.APPROVED);
      expect(fs.unlink).toHaveBeenCalledWith("/tmp/file.pdf");
    });

    it("should NOT call createMediaUser or createUser when user already exists", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "Jane Smith",
        email: "test@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/tmp/file.pdf",
        proofOfIdOriginalName: "id.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      mockCheckUserExists.mockResolvedValue(true);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result).toEqual({ isNewUser: false });
      expect(mockCreateMediaUser).not.toHaveBeenCalled();
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should return isNewUser: true for new users", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "New User",
        email: "new@example.com",
        employer: "Test Employer",
        proofOfIdPath: null,
        proofOfIdOriginalName: null,
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      mockCheckUserExists.mockResolvedValue(false);
      mockCreateMediaUser.mockResolvedValue({ azureAdUserId: "new-azure-id" });

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result.isNewUser).toBe(true);
    });

    it("should return isNewUser: false for existing users", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "Existing User",
        email: "existing@example.com",
        employer: "Test Employer",
        proofOfIdPath: null,
        proofOfIdOriginalName: null,
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      mockCheckUserExists.mockResolvedValue(true);

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result.isNewUser).toBe(false);
    });

    it("should create local user record with provenance B2C_IDAM and role VERIFIED", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: null,
        proofOfIdOriginalName: null,
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      mockCheckUserExists.mockResolvedValue(false);
      mockCreateMediaUser.mockResolvedValue({ azureAdUserId: "azure-123" });

      // Act
      await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "john@example.com",
          userProvenance: "B2C_IDAM",
          role: "VERIFIED"
        })
      );
    });

    it("should throw error and not update status when Azure AD creation fails", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/tmp/file.pdf",
        proofOfIdOriginalName: "id.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      mockCheckUserExists.mockResolvedValue(false);
      mockCreateMediaUser.mockRejectedValue(new Error("Graph API unavailable"));

      // Act & Assert
      await expect(approveApplication("1", MOCK_ACCESS_TOKEN)).rejects.toThrow("Graph API unavailable");
      expect(queries.updateApplicationStatus).not.toHaveBeenCalled();
    });

    it("should not delete proof of ID when Azure AD creation fails", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/tmp/file.pdf",
        proofOfIdOriginalName: "id.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      mockCheckUserExists.mockResolvedValue(false);
      mockCreateMediaUser.mockRejectedValue(new Error("Azure AD error"));

      // Act & Assert
      await expect(approveApplication("1", MOCK_ACCESS_TOKEN)).rejects.toThrow();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should approve application without deleting file when path is null", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: null,
        proofOfIdOriginalName: null,
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.APPROVED
      });
      mockCheckUserExists.mockResolvedValue(true);

      // Act
      await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(queries.updateApplicationStatus).toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should throw error when application not found", async () => {
      vi.mocked(queries.getApplicationById).mockResolvedValue(null);

      await expect(approveApplication("non-existent", MOCK_ACCESS_TOKEN)).rejects.toThrow("Application not found");
    });

    it("should throw error when application already reviewed", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/tmp/file.pdf",
        status: APPLICATION_STATUS.APPROVED,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);

      await expect(approveApplication("1", MOCK_ACCESS_TOKEN)).rejects.toThrow("Application has already been reviewed");
    });
  });

  describe("rejectApplication", () => {
    it("should reject application without deleting file", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
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
        employer: "Test Employer",
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

  describe("splitName", () => {
    it("should split full name into given name and surname", () => {
      expect(splitName("Test Name")).toEqual({ givenName: "Test", surname: "Name" });
    });

    it("should handle multiple name parts by putting last part as surname", () => {
      expect(splitName("Test Middle Name")).toEqual({ givenName: "Test Middle", surname: "Name" });
    });

    it("should handle single name by using it for both", () => {
      expect(splitName("Test")).toEqual({ givenName: "Test", surname: "Test" });
    });

    it("should handle names with leading/trailing whitespace", () => {
      expect(splitName("  Test Name  ")).toEqual({ givenName: "Test", surname: "Name" });
    });
  });
});
