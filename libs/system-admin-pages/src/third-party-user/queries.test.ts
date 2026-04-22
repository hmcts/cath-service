import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThirdPartyUser,
  deleteThirdPartyUser,
  findAllThirdPartyUsers,
  findThirdPartyUserById,
  getHighestSensitivity,
  updateThirdPartySubscriptions
} from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    legacyThirdPartyUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    legacyThirdPartySubscription: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

const { prisma } = await import("@hmcts/postgres");

describe("findAllThirdPartyUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch all third party users with subscriptions", async () => {
    const mockUsers = [
      { id: "1", name: "User 1", createdDate: new Date(), subscriptions: [] },
      { id: "2", name: "User 2", createdDate: new Date(), subscriptions: [] }
    ];
    vi.mocked(prisma.legacyThirdPartyUser.findMany).mockResolvedValue(mockUsers);

    const result = await findAllThirdPartyUsers();

    expect(result).toEqual(mockUsers);
    expect(prisma.legacyThirdPartyUser.findMany).toHaveBeenCalledWith({
      orderBy: { createdDate: "desc" },
      include: { subscriptions: true }
    });
  });
});

describe("findThirdPartyUserById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch a third party user by id with subscriptions", async () => {
    const mockUser = { id: "1", name: "User 1", createdDate: new Date(), subscriptions: [] };
    vi.mocked(prisma.legacyThirdPartyUser.findUnique).mockResolvedValue(mockUser);

    const result = await findThirdPartyUserById("1");

    expect(result).toEqual(mockUser);
    expect(prisma.legacyThirdPartyUser.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      include: { subscriptions: true }
    });
  });
});

describe("createThirdPartyUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a third party user with trimmed name", async () => {
    const mockUser = { id: "1", name: "New User", createdDate: new Date() };
    vi.mocked(prisma.legacyThirdPartyUser.create).mockResolvedValue(mockUser);

    const result = await createThirdPartyUser("  New User  ");

    expect(result).toEqual(mockUser);
    expect(prisma.legacyThirdPartyUser.create).toHaveBeenCalledWith({
      data: { name: "New User" }
    });
  });
});

describe("deleteThirdPartyUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a third party user by id", async () => {
    const mockUser = { id: "1", name: "User 1", createdDate: new Date() };
    vi.mocked(prisma.legacyThirdPartyUser.delete).mockResolvedValue(mockUser);

    const result = await deleteThirdPartyUser("1");

    expect(result).toEqual(mockUser);
    expect(prisma.legacyThirdPartyUser.delete).toHaveBeenCalledWith({
      where: { id: "1" }
    });
  });
});

describe("updateThirdPartySubscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete existing subscriptions and create new ones", async () => {
    const mockTransaction = vi.fn(async (callback) => {
      return callback({
        legacyThirdPartySubscription: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        }
      });
    });
    vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

    const subscriptions = [
      { listTypeId: 1, channel: "API", sensitivity: "PUBLIC" },
      { listTypeId: 2, channel: "API", sensitivity: "PRIVATE" }
    ];

    await updateThirdPartySubscriptions("user-1", subscriptions);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should handle empty subscriptions array", async () => {
    const mockTransaction = vi.fn(async (callback) => {
      return callback({
        legacyThirdPartySubscription: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        }
      });
    });
    vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

    await updateThirdPartySubscriptions("user-1", []);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("getHighestSensitivity", () => {
  it("should return unselected for empty array", async () => {
    const result = await getHighestSensitivity([]);
    expect(result).toBe("unselected");
  });

  it("should return CLASSIFIED when present", async () => {
    const subscriptions = [{ sensitivity: "PUBLIC" }, { sensitivity: "CLASSIFIED" }, { sensitivity: "PRIVATE" }];
    const result = await getHighestSensitivity(subscriptions);
    expect(result).toBe("CLASSIFIED");
  });

  it("should return PRIVATE when CLASSIFIED is not present", async () => {
    const subscriptions = [{ sensitivity: "PUBLIC" }, { sensitivity: "PRIVATE" }];
    const result = await getHighestSensitivity(subscriptions);
    expect(result).toBe("PRIVATE");
  });

  it("should return PUBLIC when only PUBLIC is present", async () => {
    const subscriptions = [{ sensitivity: "PUBLIC" }];
    const result = await getHighestSensitivity(subscriptions);
    expect(result).toBe("PUBLIC");
  });
});
