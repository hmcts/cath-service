import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalMediaUser, splitName, updateLocalMediaUser } from "./service.js";

const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("./query.js", () => ({
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args)
}));

describe("account repository service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUser.mockResolvedValue({ userId: "local-user-id" });
  });

  describe("splitName", () => {
    it("should split full name into given name and surname", () => {
      expect(splitName("Test Name")).toEqual({ givenName: "Test", surname: "Name" });
    });

    it("should handle multiple name parts by putting last part as surname", () => {
      expect(splitName("Test Middle Name")).toEqual({ givenName: "Test Middle", surname: "Name" });
    });

    it("should handle single name by using empty string for surname", () => {
      expect(splitName("Test")).toEqual({ givenName: "Test", surname: "" });
    });

    it("should handle names with leading/trailing whitespace", () => {
      expect(splitName("  Test Name  ")).toEqual({ givenName: "Test", surname: "Name" });
    });
  });

  describe("createLocalMediaUser", () => {
    it("should create user with B2C_IDAM provenance and VERIFIED role", async () => {
      await createLocalMediaUser("john@example.com", "John Doe", "azure-123");

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "john@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "B2C_IDAM",
        userProvenanceId: "azure-123",
        role: "VERIFIED"
      });
    });

    it("should split name correctly when creating user", async () => {
      await createLocalMediaUser("test@example.com", "Single", "azure-456");

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Single",
          surname: ""
        })
      );
    });
  });

  describe("updateLocalMediaUser", () => {
    it("should update user with provided firstName and surname", async () => {
      await updateLocalMediaUser("azure-123", "Jane", "Smith");

      expect(mockUpdateUser).toHaveBeenCalledWith("azure-123", { firstName: "Jane", surname: "Smith" });
    });

    it("should propagate errors from updateUser", async () => {
      mockUpdateUser.mockRejectedValue(new Error("DB error"));

      await expect(updateLocalMediaUser("azure-123", "Jane", "Smith")).rejects.toThrow("DB error");
    });
  });
});
