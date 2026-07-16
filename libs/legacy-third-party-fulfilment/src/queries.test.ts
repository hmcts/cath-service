import { beforeEach, describe, expect, it, vi } from "vitest";
import { findSubscribersByListType } from "./queries.js";

const mockFindMany = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    legacyThirdPartySubscription: {
      findMany: mockFindMany
    }
  }
}));

describe("findSubscribersByListType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("returns all subscribers for the given listTypeId regardless of sensitivity", async () => {
    await findSubscribersByListType(42);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { listTypeId: 42 },
      include: { user: true }
    });
  });

  it("returns the rows returned by prisma", async () => {
    const row = {
      id: "sub-1",
      userId: "user-1",
      listTypeId: 42,
      createdDate: new Date(),
      user: { id: "user-1", name: "Courtel", createdDate: new Date() }
    };
    mockFindMany.mockResolvedValue([row]);

    const result = await findSubscribersByListType(42);

    expect(result).toEqual([row]);
  });
});
