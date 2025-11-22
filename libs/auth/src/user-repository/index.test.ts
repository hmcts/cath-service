import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateUserInput } from "./index.js";
import { createOrUpdateUser, createUser, findUserByEmail, findUserByProvenanceId, updateUser } from "./index.js";

// Mock @hmcts/postgres
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

// Import after mocking
const { prisma } = await import("@hmcts/postgres");

describe("User Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a new user with all fields", async () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: "VERIFIED"
      };

      const mockUser = {
        userId: "user-123",
        email: input.email,
        firstName: input.firstName,
        surname: input.surname,
        userProvenance: input.userProvenance,
        userProvenanceId: input.userProvenanceId,
        role: input.role,
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const result = await createUser(input);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: input.email,
          firstName: input.firstName,
          surname: input.surname,
          userProvenance: input.userProvenance,
          userProvenanceId: input.userProvenanceId,
          role: input.role,
          lastSignedInDate: expect.any(Date)
        }
      });
      expect(result).toEqual(mockUser);
    });

    it("should create a user without optional fields", async () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        userProvenance: "CFT_IDAM",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174001",
        role: "VERIFIED"
      };

      const mockUser = {
        userId: "user-124",
        email: input.email,
        firstName: null,
        surname: null,
        userProvenance: input.userProvenance,
        userProvenanceId: input.userProvenanceId,
        role: input.role,
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      await createUser(input);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: input.email,
          firstName: undefined,
          surname: undefined
        })
      });
    });
  });

  describe("findUserByProvenanceId", () => {
    it("should find a user by provenance ID", async () => {
      const provenanceId = "123e4567-e89b-12d3-a456-426614174000";
      const mockUser = {
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: provenanceId,
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await findUserByProvenanceId(provenanceId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userProvenanceId: provenanceId }
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await findUserByProvenanceId("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findUserByEmail", () => {
    it("should find a user by email", async () => {
      const email = "test@example.com";
      const mockUser = {
        userId: "user-123",
        email,
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const result = await findUserByEmail(email);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("updateUser", () => {
    it("should update user role", async () => {
      const provenanceId = "123e4567-e89b-12d3-a456-426614174000";
      const mockUser = {
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: provenanceId,
        role: "LOCAL_ADMIN",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const result = await updateUser(provenanceId, { role: "LOCAL_ADMIN" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: provenanceId },
        data: { role: "LOCAL_ADMIN" }
      });
      expect(result).toEqual(mockUser);
    });

    it("should update last signed in date", async () => {
      const provenanceId = "123e4567-e89b-12d3-a456-426614174000";
      const lastSignedInDate = new Date();
      const mockUser = {
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: provenanceId,
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate
      };

      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      await updateUser(provenanceId, { lastSignedInDate });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: provenanceId },
        data: { lastSignedInDate }
      });
    });
  });

  describe("createOrUpdateUser", () => {
    it("should create a new user if not exists", async () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: "VERIFIED"
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        userId: "user-123",
        ...input,
        createdDate: new Date(),
        lastSignedInDate: new Date()
      });

      await createOrUpdateUser(input);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId }
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should update existing user if found", async () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: "LOCAL_ADMIN"
      };

      const existingUser = {
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: input.userProvenanceId,
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...existingUser,
        role: "LOCAL_ADMIN",
        lastSignedInDate: new Date()
      });

      await createOrUpdateUser(input);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId }
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId },
        data: {
          role: "LOCAL_ADMIN",
          lastSignedInDate: expect.any(Date)
        }
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should update last signed in date when user exists", async () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        userProvenance: "CFT_IDAM",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: "VERIFIED"
      };

      const existingUser = {
        userId: "user-123",
        email: "test@example.com",
        firstName: null,
        surname: null,
        userProvenance: "CFT_IDAM",
        userProvenanceId: input.userProvenanceId,
        role: "VERIFIED",
        createdDate: new Date("2025-01-01"),
        lastSignedInDate: new Date("2025-01-01")
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...existingUser,
        lastSignedInDate: new Date()
      });

      await createOrUpdateUser(input);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId },
        data: {
          role: "VERIFIED",
          lastSignedInDate: expect.any(Date)
        }
      });
    });
  });
});
