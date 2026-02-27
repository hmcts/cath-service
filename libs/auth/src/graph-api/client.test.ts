import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "../user-profile.js";

// Mock the Microsoft Graph Client
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn(() => ({
      api: vi.fn()
    }))
  }
}));

// Mock global fetch for client credentials tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("fetchUserProfile", () => {
  it("should fetch user profile with mail field", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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
    const { fetchUserProfile } = await import("./client.js");

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

describe("MOCK_AZURE_B2C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MOCK_AZURE_B2C = "true";
  });

  afterEach(() => {
    delete process.env.MOCK_AZURE_B2C;
  });

  it("should return mock access token when MOCK_AZURE_B2C is true", async () => {
    const { getGraphApiAccessToken } = await import("./client.js");

    const token = await getGraphApiAccessToken();

    expect(token).toBe("mock-access-token");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return false for checkUserExists when MOCK_AZURE_B2C is true", async () => {
    const { checkUserExists } = await import("./client.js");

    const result = await checkUserExists("any-token", "user@example.com");

    expect(result).toBe(false);
  });

  it("should return mock user ID for createMediaUser when MOCK_AZURE_B2C is true", async () => {
    const { createMediaUser } = await import("./client.js");

    const result = await createMediaUser("any-token", {
      email: "test@example.com",
      displayName: "Test User",
      givenName: "Test",
      surname: "User"
    });

    expect(result.azureAdUserId).toMatch(/^mock-azure-ad-/);
  });
});

describe("getGraphApiAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AZURE_B2C_TENANT_ID = "test-tenant-id";
    process.env.AZURE_B2C_CLIENT_ID = "test-client-id";
    process.env.AZURE_B2C_CLIENT_SECRET = "test-client-secret";
  });

  it("should obtain token via client credentials flow", async () => {
    const { getGraphApiAccessToken } = await import("./client.js");

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "test-access-token-123" })
    });

    const token = await getGraphApiAccessToken();

    expect(token).toBe("test-access-token-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://login.microsoftonline.com/test-tenant-id/oauth2/v2.0/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      })
    );
  });

  it("should throw error when credentials are missing", async () => {
    delete process.env.AZURE_B2C_TENANT_ID;

    const { getGraphApiAccessToken } = await import("./client.js");

    await expect(getGraphApiAccessToken()).rejects.toThrow("Azure B2C credentials not configured");
  });

  it("should throw error when token request fails", async () => {
    const { getGraphApiAccessToken } = await import("./client.js");

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    await expect(getGraphApiAccessToken()).rejects.toThrow("Failed to obtain Graph API access token: 401 Unauthorized");
  });
});

describe("checkUserExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when user is found", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { checkUserExists } = await import("./client.js");

    const mockGet = vi.fn().mockResolvedValue({
      value: [{ id: "user-123" }]
    });
    const mockSelect = vi.fn().mockReturnValue({ get: mockGet });
    const mockFilter = vi.fn().mockReturnValue({ select: mockSelect });
    const mockApi = vi.fn().mockReturnValue({ filter: mockFilter });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    const result = await checkUserExists("test-token", "user@example.com");

    expect(result).toBe(true);
    expect(mockApi).toHaveBeenCalledWith("/users");
    expect(mockFilter).toHaveBeenCalledWith("mail eq 'user@example.com'");
  });

  it("should return false when user is not found", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { checkUserExists } = await import("./client.js");

    const mockGet = vi.fn().mockResolvedValue({ value: [] });
    const mockSelect = vi.fn().mockReturnValue({ get: mockGet });
    const mockFilter = vi.fn().mockReturnValue({ select: mockSelect });
    const mockApi = vi.fn().mockReturnValue({ filter: mockFilter });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    const result = await checkUserExists("test-token", "nobody@example.com");

    expect(result).toBe(false);
  });

  it("should sanitise single quotes in email to prevent OData injection", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { checkUserExists } = await import("./client.js");

    const mockGet = vi.fn().mockResolvedValue({ value: [] });
    const mockSelect = vi.fn().mockReturnValue({ get: mockGet });
    const mockFilter = vi.fn().mockReturnValue({ select: mockSelect });
    const mockApi = vi.fn().mockReturnValue({ filter: mockFilter });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    await checkUserExists("test-token", "test'user@example.com");

    expect(mockFilter).toHaveBeenCalledWith("mail eq 'test''user@example.com'");
  });

  it("should throw error when Graph API fails", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { checkUserExists } = await import("./client.js");

    const mockGet = vi.fn().mockRejectedValue({ message: "Service unavailable" });
    const mockSelect = vi.fn().mockReturnValue({ get: mockGet });
    const mockFilter = vi.fn().mockReturnValue({ select: mockSelect });
    const mockApi = vi.fn().mockReturnValue({ filter: mockFilter });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    await expect(checkUserExists("test-token", "user@example.com")).rejects.toThrow("Failed to check user existence: Service unavailable");
  });
});

describe("createMediaUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AZURE_B2C_TENANT_ID = "test-tenant-id";
    process.env.AZURE_B2C_DOMAIN = "test-tenant.onmicrosoft.com";
  });

  it("should create user with displayName, givenName, surname", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { createMediaUser } = await import("./client.js");

    const mockPost = vi.fn().mockResolvedValue({ id: "new-user-id-456" });
    const mockApi = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    const result = await createMediaUser("test-token", {
      email: "test@example.com",
      displayName: "Test Name",
      givenName: "Test",
      surname: "Name"
    });

    expect(result).toEqual({ azureAdUserId: "new-user-id-456" });
    expect(mockApi).toHaveBeenCalledWith("/users");
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        accountEnabled: true,
        displayName: "Test Name",
        givenName: "Test",
        surname: "Name",
        mail: "test@example.com",
        mailNickname: "test",
        identities: [
          {
            signInType: "emailAddress",
            issuer: "test-tenant.onmicrosoft.com",
            issuerAssignedId: "test@example.com"
          }
        ],
        passwordProfile: expect.objectContaining({
          forceChangePasswordNextSignIn: true
        })
      })
    );
  });

  it("should set forceChangePasswordNextSignIn to true", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { createMediaUser } = await import("./client.js");

    const mockPost = vi.fn().mockResolvedValue({ id: "user-789" });
    const mockApi = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    await createMediaUser("test-token", {
      email: "test@example.com",
      displayName: "Test Reporter",
      givenName: "Test",
      surname: "Reporter"
    });

    const postedData = mockPost.mock.calls[0][0];
    expect(postedData.passwordProfile.forceChangePasswordNextSignIn).toBe(true);
  });

  it("should NOT include employer in user properties", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { createMediaUser } = await import("./client.js");

    const mockPost = vi.fn().mockResolvedValue({ id: "user-101" });
    const mockApi = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    await createMediaUser("test-token", {
      email: "test@employer.com",
      displayName: "Test User",
      givenName: "Test",
      surname: "User"
    });

    const postedData = mockPost.mock.calls[0][0];
    expect(postedData).not.toHaveProperty("employer");
    expect(postedData).not.toHaveProperty("companyName");
  });

  it("should use AZURE_B2C_DOMAIN for userPrincipalName", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { createMediaUser } = await import("./client.js");

    const mockPost = vi.fn().mockResolvedValue({ id: "user-upn-test" });
    const mockApi = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    await createMediaUser("test-token", {
      email: "test@example.com",
      displayName: "Test Reporter",
      givenName: "Test",
      surname: "Reporter"
    });

    const postedData = mockPost.mock.calls[0][0];
    expect(postedData.userPrincipalName).toMatch(/@test-tenant\.onmicrosoft\.com$/);
  });

  it("should throw error when AZURE_B2C_DOMAIN is not configured", async () => {
    delete process.env.AZURE_B2C_DOMAIN;

    const { createMediaUser } = await import("./client.js");

    await expect(
      createMediaUser("test-token", {
        email: "test@example.com",
        displayName: "Test",
        givenName: "Test",
        surname: "User"
      })
    ).rejects.toThrow("Azure B2C domain not configured: AZURE_B2C_DOMAIN is required");
  });

  it("should throw error when Graph API fails with no retry", async () => {
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { createMediaUser } = await import("./client.js");

    const mockPost = vi.fn().mockRejectedValue({ message: "Forbidden" });
    const mockApi = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(Client.init).mockReturnValue({ api: mockApi } as any);

    await expect(
      createMediaUser("test-token", {
        email: "test@example.com",
        displayName: "Test",
        givenName: "Test",
        surname: "User"
      })
    ).rejects.toThrow("Failed to create media user in Azure AD: Forbidden");

    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
