import { CONTAINER, deleteBlob } from "@hmcts/azure-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_STATUS } from "./model.js";
import * as queries from "./queries.js";
import { approveApplication, rejectApplication } from "./service.js";

vi.mock("@hmcts/azure-blob", () => ({
  deleteBlob: vi.fn().mockResolvedValue(undefined),
  CONTAINER: { FILES: "files" }
}));
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
        proofOfIdPath: "1.pdf",
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
      expect(deleteBlob).toHaveBeenCalledWith("1.pdf", CONTAINER.FILES);
    });

    it("should normalise legacy absolute path before deleting blob on approval", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/Users/app/storage/temp/files/1.pdf",
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

      // Act
      await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(deleteBlob).toHaveBeenCalledWith("1.pdf", CONTAINER.FILES);
    });

    it("should update existing Azure AD user and not create new user when user already exists", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "Jane Smith",
        email: "test@example.com",
        employer: "Test Employer",
        proofOfIdPath: "1.pdf",
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

      // Act
      const result = await approveApplication("1", MOCK_ACCESS_TOKEN);

      // Assert
      expect(result).toEqual({ isNewUser: false });
      expect(mockUpdateMediaUser).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, "existing-azure-id", {
        displayName: "Jane Smith",
        givenName: "Jane",
        surname: "Smith"
      });
      expect(mockUpdateLocalMediaUser).toHaveBeenCalledWith("test@example.com", "existing-azure-id", "Jane", "Smith");
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
        proofOfIdPath: "1.pdf",
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
        proofOfIdPath: "1.pdf",
        proofOfIdOriginalName: "id.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      mockFindUserByEmail.mockResolvedValue(null);
      mockCreateMediaUser.mockRejectedValue(new Error("Azure AD error"));

      // Act & Assert
      await expect(approveApplication("1", MOCK_ACCESS_TOKEN)).rejects.toThrow();
      expect(deleteBlob).not.toHaveBeenCalled();
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
      expect(deleteBlob).not.toHaveBeenCalled();
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
        proofOfIdPath: "1.pdf",
        status: APPLICATION_STATUS.APPROVED,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);

      await expect(approveApplication("1", MOCK_ACCESS_TOKEN)).rejects.toThrow("Application has already been reviewed");
    });
  });

  describe("rejectApplication", () => {
    it("should reject application and delete proof of ID blob", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "1.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.REJECTED
      });

      // Act
      await rejectApplication("1");

      // Assert
      expect(queries.getApplicationById).toHaveBeenCalledWith("1");
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.REJECTED);
      expect(deleteBlob).toHaveBeenCalledWith("1.pdf", CONTAINER.FILES);
    });

    it("should normalise legacy absolute path before deleting blob", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "/Users/app/storage/temp/files/1.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({
        ...mockApplication,
        status: APPLICATION_STATUS.REJECTED
      });

      // Act
      await rejectApplication("1");

      // Assert
      expect(deleteBlob).toHaveBeenCalledWith("1.pdf", CONTAINER.FILES);
    });

    it("should reject application without deleting file when proofOfIdPath is null", async () => {
      // Arrange
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

      // Act
      await rejectApplication("1");

      // Assert
      expect(queries.updateApplicationStatus).toHaveBeenCalledWith("1", APPLICATION_STATUS.REJECTED);
      expect(deleteBlob).not.toHaveBeenCalled();
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
        proofOfIdPath: "1.pdf",
        status: APPLICATION_STATUS.APPROVED,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);

      await expect(rejectApplication("1")).rejects.toThrow("Application has already been reviewed");
    });

    it("should propagate error when deleteBlob rejects during rejection", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "Test Employer",
        proofOfIdPath: "1.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({ ...mockApplication, status: APPLICATION_STATUS.REJECTED });
      vi.mocked(deleteBlob).mockRejectedValue(new Error("Storage unavailable"));

      // Act & Assert
      await expect(rejectApplication("1")).rejects.toThrow("Storage unavailable");
    });
  });

  describe("approveApplication - Promise.all propagation", () => {
    it("should propagate error when deleteBlob rejects during approval", async () => {
      // Arrange
      const mockApplication = {
        id: "1",
        name: "Jane Doe",
        email: "jane@example.com",
        employer: "Test Employer",
        proofOfIdPath: "1.pdf",
        proofOfIdOriginalName: "id.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date()
      };

      vi.mocked(queries.getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(queries.updateApplicationStatus).mockResolvedValue({ ...mockApplication, status: APPLICATION_STATUS.APPROVED });
      mockFindUserByEmail.mockResolvedValue("existing-azure-id");
      vi.mocked(deleteBlob).mockRejectedValue(new Error("Blob storage error"));

      // Act & Assert
      await expect(approveApplication("1", MOCK_ACCESS_TOKEN)).rejects.toThrow("Blob storage error");
    });
  });
});
