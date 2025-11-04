import { describe, expect, it, vi } from "vitest";
import type { UserProfile } from "./types.js";

// Mock the Microsoft Graph Client
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn(() => ({
      api: vi.fn()
    }))
  }
}));

describe("fetchUserProfile", () => {
  it("should fetch user profile with mail field", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockResolvedValueOnce({
      id: "user-123",
      mail: "user@example.com",
      userPrincipalName: "user@domain.com",
      displayName: "Test User"
    });
    mockGet.mockResolvedValueOnce({
      value: [
        { id: "group-1", displayName: "Admin Group" },
        { id: "group-2", displayName: "User Group" }
      ]
    });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    const result: UserProfile = await fetchUserProfile("test-token");

    expect(result).toEqual({
      id: "user-123",
      email: "user@example.com",
      displayName: "Test User",
      roles: ["Admin Group", "User Group"],
      groupIds: ["group-1", "group-2"],
      accessToken: "test-token"
    });
  });

  it("should use userPrincipalName when mail is not available", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockResolvedValueOnce({
      id: "user-456",
      userPrincipalName: "user@domain.com",
      displayName: "Test User 2"
    });
    mockGet.mockResolvedValueOnce({
      value: []
    });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    const result = await fetchUserProfile("test-token");

    expect(result.email).toBe("user@domain.com");
  });

  it("should handle empty memberOf response", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockResolvedValueOnce({
      id: "user-789",
      mail: "user@example.com",
      userPrincipalName: "user@domain.com",
      displayName: "Test User 3"
    });
    mockGet.mockResolvedValueOnce({});

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    const result = await fetchUserProfile("test-token");

    expect(result.roles).toEqual([]);
    expect(result.groupIds).toEqual([]);
  });

  it("should handle groups without displayName", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockResolvedValueOnce({
      id: "user-101",
      mail: "user@example.com",
      userPrincipalName: "user@domain.com",
      displayName: "Test User 4"
    });
    mockGet.mockResolvedValueOnce({
      value: [{ id: "group-1" }, { id: "group-2", displayName: "Named Group" }]
    });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    const result = await fetchUserProfile("test-token");

    expect(result.roles).toEqual(["Named Group"]);
    expect(result.groupIds).toEqual(["group-1", "group-2"]);
  });

  it("should handle groups without id", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockResolvedValueOnce({
      id: "user-102",
      mail: "user@example.com",
      userPrincipalName: "user@domain.com",
      displayName: "Test User 5"
    });
    mockGet.mockResolvedValueOnce({
      value: [{ displayName: "Group Without ID" }, { id: "group-2", displayName: "Valid Group" }]
    });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    const result = await fetchUserProfile("test-token");

    expect(result.roles).toEqual(["Group Without ID", "Valid Group"]);
    expect(result.groupIds).toEqual(["group-2"]);
  });

  it("should throw error on Graph API failure with message", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockRejectedValue({
      statusCode: 403,
      message: "Access denied"
    });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    await expect(fetchUserProfile("test-token")).rejects.toThrow("Failed to fetch user profile: Access denied");
  });

  it("should throw error on Graph API failure without message", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockRejectedValue({ statusCode: 500 });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    await expect(fetchUserProfile("test-token")).rejects.toThrow("Failed to fetch user profile: Unknown error");
  });

  it("should handle memberOf.value not being an array", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./graph-client.js");

    const mockApi = vi.fn();
    const mockGet = vi.fn();

    mockApi.mockReturnThis();
    mockGet.mockResolvedValueOnce({
      id: "user-103",
      mail: "user@example.com",
      userPrincipalName: "user@domain.com",
      displayName: "Test User 6"
    });
    mockGet.mockResolvedValueOnce({
      value: "not-an-array"
    });

    vi.mocked(Client.init).mockReturnValue({
      api: mockApi.mockReturnValue({ get: mockGet })
    } as any);

    const result = await fetchUserProfile("test-token");

    expect(result.roles).toEqual([]);
    expect(result.groupIds).toEqual([]);
  });
});
