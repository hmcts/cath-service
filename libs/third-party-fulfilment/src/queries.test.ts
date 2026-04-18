import { beforeEach, describe, expect, it, vi } from "vitest";
import { findSubscribersByListType } from "./queries.js";

const mockFindMany = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/postgres", () => ({
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

  it("filters PUBLIC publications to all sensitivity levels", async () => {
    await findSubscribersByListType(42, "PUBLIC");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { listTypeId: 42, sensitivity: { in: ["PUBLIC", "PRIVATE", "CLASSIFIED"] } },
      include: { user: true }
    });
  });

  it("filters PRIVATE publications to PRIVATE and CLASSIFIED subscribers only", async () => {
    await findSubscribersByListType(42, "PRIVATE");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { listTypeId: 42, sensitivity: { in: ["PRIVATE", "CLASSIFIED"] } },
      include: { user: true }
    });
  });

  it("filters CLASSIFIED publications to CLASSIFIED subscribers only", async () => {
    await findSubscribersByListType(42, "CLASSIFIED");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { listTypeId: 42, sensitivity: { in: ["CLASSIFIED"] } },
      include: { user: true }
    });
  });

  it("treats unknown sensitivity as PUBLIC and includes all levels", async () => {
    await findSubscribersByListType(42, "UNKNOWN");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { listTypeId: 42, sensitivity: { in: ["PUBLIC", "PRIVATE", "CLASSIFIED"] } },
      include: { user: true }
    });
  });

  it("returns the rows returned by prisma", async () => {
    const row = {
      id: "sub-1",
      userId: "user-1",
      listTypeId: 42,
      channel: "API",
      sensitivity: "PRIVATE",
      createdDate: new Date(),
      user: { id: "user-1", name: "Courtel", createdDate: new Date() }
    };
    mockFindMany.mockResolvedValue([row]);

    const result = await findSubscribersByListType(42, "PRIVATE");

    expect(result).toEqual([row]);
  });
});
