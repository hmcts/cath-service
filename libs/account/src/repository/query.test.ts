import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ROLES } from "../roles.js";
import type { User } from "./model.js";
import { createOrUpdateUser, createUser, findSystemAdminEmails, findUserByEmail, findUserById, findUserByProvenanceId, updateUser } from "./query.js";

// Mock @hmcts/postgres
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}));

// Import after mocking
const { prisma } = await import("@hmcts/postgres-prisma");

describe("User Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a new user with all fields", async () => {
      const input: User = {
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
        firstName: input.firstName ?? null,
        surname: input.surname ?? null,
        userProvenance: input.userProvenance,
        userProvenanceId: input.userProvenanceId,
        role: input.role,
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

      const result = await createUser(input);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: input.email,
          firstName: input.firstName,
          surname: input.surname,
          userProvenance: input.userProvenance,
          userProvenanceId: input.userProvenanceId,
          role: input.role
        }
      });
      expect(result).toEqual(mockUser);
    });

    it("should create a user without optional fields", async () => {
      const input: User = {
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
    it("should set createdDate and lastSignedInDate when signedInAt is provided", async () => {
      // Arrange
      const signedInAt = new Date("2026-10-19T09:30:00.000Z");
      const input: User = {
        email: "test@example.com",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174002",
        role: USER_ROLES.SYSTEM_ADMIN
      };
      vi.mocked(prisma.user.create).mockResolvedValue({} as any);

      // Act
      await createUser(input, signedInAt);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdDate: signedInAt,
          lastSignedInDate: signedInAt
        })
      });
    });

    it("should not set createdDate or lastSignedInDate when signedInAt is not provided", async () => {
      // Arrange
      const input: User = {
        email: "media@example.com",
        userProvenance: "PI_AAD",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174003",
        role: USER_ROLES.VERIFIED
      };
      vi.mocked(prisma.user.create).mockResolvedValue({} as any);

      // Act
      await createUser(input);

      // Assert
      const { data } = vi.mocked(prisma.user.create).mock.calls[0][0];
      expect(data).not.toHaveProperty("createdDate");
      expect(data).not.toHaveProperty("lastSignedInDate");
    });
  });

  describe("findUserById", () => {
    it("should find a user by user ID", async () => {
      const userId = "user-123";
      const mockUser = {
        userId,
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await findUserById(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userId }
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null if user not found by ID", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await findUserById("non-existent-id");

      expect(result).toBeNull();
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
        role: USER_ROLES.INTERNAL_ADMIN_LOCAL,
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const result = await updateUser(provenanceId, { role: USER_ROLES.INTERNAL_ADMIN_LOCAL });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: provenanceId },
        data: { role: USER_ROLES.INTERNAL_ADMIN_LOCAL }
      });
      expect(result).toEqual(mockUser);
    });

    it("should update firstName and surname", async () => {
      const provenanceId = "123e4567-e89b-12d3-a456-426614174000";
      const mockUser = {
        userId: "user-123",
        email: "test@example.com",
        firstName: "Jane",
        surname: "Smith",
        userProvenance: "SSO",
        userProvenanceId: provenanceId,
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      await updateUser(provenanceId, { firstName: "Jane", surname: "Smith" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: provenanceId },
        data: { firstName: "Jane", surname: "Smith" }
      });
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
      const input: User = {
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
        firstName: input.firstName ?? null,
        surname: input.surname ?? null,
        createdDate: new Date(),
        lastSignedInDate: new Date()
      } as any);

      await createOrUpdateUser(input);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId }
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    describe("when the user signs in for the first time", () => {
      const now = new Date("2026-10-19T10:15:30.123Z");

      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it.each([
        { userProvenance: "SSO", role: USER_ROLES.SYSTEM_ADMIN },
        { userProvenance: "SSO", role: USER_ROLES.INTERNAL_ADMIN_CTSC },
        { userProvenance: "SSO", role: USER_ROLES.INTERNAL_ADMIN_LOCAL },
        { userProvenance: "CFT_IDAM", role: USER_ROLES.VERIFIED }
      ] as const)("should set createdDate and lastSignedInDate to the same time for $userProvenance $role user", async ({ userProvenance, role }) => {
        // Arrange
        const input: User = {
          email: "first-login@example.com",
          firstName: "First",
          surname: "Login",
          userProvenance,
          userProvenanceId: "123e4567-e89b-12d3-a456-426614174099",
          role
        };
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.user.create).mockResolvedValue({} as any);

        // Act
        await createOrUpdateUser(input);

        // Assert
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: {
            email: input.email,
            firstName: input.firstName,
            surname: input.surname,
            userProvenance,
            userProvenanceId: input.userProvenanceId,
            role,
            createdDate: now,
            lastSignedInDate: now
          }
        });
        const { data } = vi.mocked(prisma.user.create).mock.calls[0][0];
        expect(data.createdDate).toBe(data.lastSignedInDate);
        expect(prisma.user.update).not.toHaveBeenCalled();
      });
    });

    it("should update existing user if found", async () => {
      const input: User = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "SSO",
        userProvenanceId: "123e4567-e89b-12d3-a456-426614174000",
        role: USER_ROLES.INTERNAL_ADMIN_LOCAL
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
        role: USER_ROLES.INTERNAL_ADMIN_LOCAL,
        lastSignedInDate: new Date()
      });

      await createOrUpdateUser(input);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId }
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userProvenanceId: input.userProvenanceId },
        data: {
          role: USER_ROLES.INTERNAL_ADMIN_LOCAL,
          lastSignedInDate: expect.any(Date)
        }
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should update last signed in date when user exists", async () => {
      const input: User = {
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

  describe("findSystemAdminEmails", () => {
    it("should return all system admin emails", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "admin1@example.com" }, { email: "admin2@example.com" }] as any);

      const result = await findSystemAdminEmails();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: "SYSTEM_ADMIN" },
        select: { email: true }
      });
      expect(result).toEqual(["admin1@example.com", "admin2@example.com"]);
    });

    it("should return an empty array when there are no system admins", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);

      const result = await findSystemAdminEmails();

      expect(result).toEqual([]);
    });
  });
});
