import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/audit-log/config", () => ({ prismaSchemas: "/mock/audit-log/prisma" }));
vi.mock("@hmcts/list-search-config/config", () => ({ prismaSchemas: "/mock/list-search-config/prisma" }));
vi.mock("@hmcts/location/config", () => ({ prismaSchemas: "/mock/location/prisma" }));
vi.mock("@hmcts/notifications/config", () => ({ prismaSchemas: "/mock/notifications/prisma" }));
vi.mock("@hmcts/subscriptions/config", () => ({ prismaSchemas: "/mock/subscriptions/prisma" }));
vi.mock("@hmcts/third-party-user/config", () => ({ prismaSchemas: "/mock/third-party-user/prisma" }));

describe("getPrismaSchemas", () => {
  it("should return all 6 schema paths", async () => {
    // Arrange & Act
    const { getPrismaSchemas } = await import("./schema-discovery.js");
    const schemas = getPrismaSchemas();

    // Assert
    expect(schemas).toHaveLength(6);
    expect(schemas).toEqual([
      "/mock/subscriptions/prisma",
      "/mock/location/prisma",
      "/mock/notifications/prisma",
      "/mock/list-search-config/prisma",
      "/mock/audit-log/prisma",
      "/mock/third-party-user/prisma"
    ]);
  });

  it("should return strings for all schema paths", async () => {
    // Arrange & Act
    const { getPrismaSchemas } = await import("./schema-discovery.js");
    const schemas = getPrismaSchemas();

    // Assert
    for (const schema of schemas) {
      expect(typeof schema).toBe("string");
    }
  });
});
