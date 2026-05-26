import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_STATUS } from "./model.js";
import * as queries from "./queries.js";
import { approveApplication, deleteProofOfIdFile, rejectApplication } from "./service.js";

vi.mock("node:fs/promises");
vi.mock("./queries.js");

const mockFindUserByEmail = vi.fn();
const mockCreateMediaUser = vi.fn();
const mockUpdateMediaUser = vi.fn();

vi.mock("@hmcts/auth", () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  createMediaUser: (...args: unknown[]) => mockCreateMediaUser(...args),
  updateMediaUser: (...args: unknown[]) => mockUpdateMediaUser(...args)
}));

const mockCreateLocalMediaUser = vi.fn();
const mockUpdateLocalMediaUser = vi.fn();

vi.mock("@hmcts/account/repository/service", () => ({
  splitName: (name: string) => {
    const trimmed = name.trim();
    const lastSpaceIndex = trimmed.lastIndexOf(" ");
    if (lastSpaceIndex === -1) return { givenName: trimmed, surname: "" };
    return { givenName: trimmed.substring(0, lastSpaceIndex), surname: trimmed.substring(lastSpaceIndex + 1) };
  },
  createLocalMediaUser: (...args: unknown[]) => mockCreateLocalMediaUser(...args),
  updateLocalMediaUser: (...args: unknown[]) => mockUpdateLocalMediaUser(...args)
}));

const MOCK_ACCESS_TOKEN = "test-access-token";

describe("media-application service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLocalMediaUser.mockResolvedValue(undefined);
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
      mockFindUserByEmail.mockResolvedValue(null);
      mockCreateMediaUser.mockResolvedValue({ azureAdUserId: "azure-user-123" });
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result).toEqual({ isNewUser: true });
      expect(mockFindUserByEmail).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, "john@example.com");
      expect(mockCreateMediaUser).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, {
        email: "john@example.com",
        displayName: "John Doe",
        givenName: "John",
        surname: "Doe"
      });
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.APPROVED);
      expect(fs.unlink).toHaveBeenCalledWith("/tmp/file.pdf");
    });

    it("should update existing Azure AD user and not create new user when user already exists", async () => {
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
      mockFindUserByEmail.mockResolvedValue("existing-azure-id");
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result).toEqual({ isNewUser: false });
      expect(mockUpdateMediaUser).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, "existing-azure-id", {
        displayName: "Jane Smith",
        givenName: "Jane",
        surname: "Smith"
      });
      expect(mockUpdateLocalMediaUser).toHaveBeenCalledWith("existing-azure-id", "Jane", "Smith");
      expect(mockCreateMediaUser).not.toHaveBeenCalled();
      expect(mockCreateLocalMediaUser).not.toHaveBeenCalled();
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
      mockFindUserByEmail.mockResolvedValue(null);
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
      mockFindUserByEmail.mockResolvedValue("existing-azure-id");

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
      mockFindUserByEmail.mockResolvedValue(null);
      mockCreateMediaUser.mockResolvedValue({ azureAdUserId: "azure-123" });

      // Act
      await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(mockCreateLocalMediaUser).toHaveBeenCalledWith("john@example.com", "John Doe", "azure-123");
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
      mockFindUserByEmail.mockResolvedValue(null);
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
      mockFindUserByEmail.mockResolvedValue(null);
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
      mockFindUserByEmail.mockResolvedValue("existing-azure-id");

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
    it("should reject application and delete proof of ID file", async () => {
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
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await rejectApplication("1");

      expect(queries.getApplicationById).toHaveBeenCalledWith("1");
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.REJECTED);
      expect(fs.unlink).toHaveBeenCalledWith("/tmp/file.pdf");
    });

    it("should reject application without deleting file when proofOfIdPath is null", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: null,
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.REJECTED
      });

      await rejectApplication("1");

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
});
