import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "../environments.js";
import { LOCAL_REQUESTER_ID, pipApi } from "./pip-api.js";

const API = {
  keyVault: "pip-bootstrap",
  tenantId: "tenant",
  dataManagement: { clientId: "data-id", clientSecret: "data-pwd", scope: "data-scope" },
  accountManagement: { clientId: "account-id", clientSecret: "account-pwd", scope: "account-scope" }
};
const SECRETS: Record<string, string> = {
  tenant: "t1",
  "data-id": "dc",
  "data-pwd": "ds",
  "data-scope": "api://data",
  "account-id": "ac",
  "account-pwd": "as",
  "account-scope": "api://account"
};

function environment(pip: Partial<Environment["pip"]>, secrets: Record<string, string> = {}) {
  const secret = vi.fn(async (_config: { keyVault?: string }, name: string) => secrets[name] ?? null);
  return { env: { name: "x", pip: { storage: {}, ...pip }, secret } as unknown as Environment, secret };
}

describe("pipApi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("PIP_DATA_MANAGEMENT_URL", "");
    vi.stubEnv("PIP_ACCOUNT_MANAGEMENT_URL", "");
    delete process.env.PIP_DATA_MANAGEMENT_URL;
    delete process.env.PIP_ACCOUNT_MANAGEMENT_URL;
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://login.microsoftonline.com/") ? Response.json({ access_token: `token-for-${url.split("/")[3]}` }) : Response.json({ ok: true })
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("should call a local pip with no token, as any requester, and as another when asked", async () => {
    // Arrange
    const { env } = environment({});

    // Act
    const api = await pipApi(env);
    await api.request("data", "/locations/1");
    await api.asRequester("admin-1").json("account", "/audit", { method: "POST", body: { a: 1 } });

    // Assert
    expect(api.deployed).toBe(false);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:18090/locations/1", {
      method: "GET",
      headers: { "x-requester-id": LOCAL_REQUESTER_ID },
      body: undefined
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:16969/audit", {
      method: "POST",
      headers: { "x-requester-id": "admin-1", "content-type": "application/json" },
      body: '{"a":1}'
    });
    expect(api.requesterId).toBe(LOCAL_REQUESTER_ID);
  });

  it("should get a client-credentials token per API from the vault's secrets, and send each API its own", async () => {
    // Arrange
    const { env, secret } = environment({ dataManagementUrl: "https://data", accountManagementUrl: "https://account", api: API }, SECRETS);

    // Act
    const api = await pipApi(env);
    await api.request("data", "/publication", { method: "POST", requester: false });
    await api.request("account", "/account/all");

    // Assert
    expect(secret).toHaveBeenCalledWith(expect.objectContaining({ keyVault: "pip-bootstrap" }), "data-id");
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://login.microsoftonline.com/t1/oauth2/v2.0/token");
    expect(Object.fromEntries(tokenInit.body as URLSearchParams)).toEqual({
      client_id: "dc",
      client_secret: "ds",
      scope: "api://data/.default",
      grant_type: "client_credentials"
    });
    expect(api.deployed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://data/publication", { method: "POST", headers: { authorization: "Bearer token-for-t1" }, body: undefined });
    expect(fetchMock).toHaveBeenLastCalledWith("https://account/account/all", {
      method: "GET",
      headers: { "x-requester-id": LOCAL_REQUESTER_ID, authorization: "Bearer token-for-t1" },
      body: undefined
    });
  });

  it("should name the secret it is missing, and only the status of a refused token", async () => {
    // Arrange
    const missing = environment({ api: API }, { ...SECRETS, "account-pwd": "" }).env;
    const refused = environment({ api: API }, SECRETS).env;

    // Act
    const noSecret = pipApi(missing);

    // Assert
    await expect(noSecret).rejects.toThrow("no account-pwd in pip-bootstrap (or ACCOUNT_PWD) to call pip's APIs with");
    fetchMock.mockResolvedValue(new Response("secret echoed back", { status: 401 }));
    await expect(pipApi(refused)).rejects.toThrow(/^Entra ID refused a token for pip \(data-id\): 401$/);
  });

  it("should fail on a refusal or errored accounts, and give back text that is not JSON", async () => {
    // Arrange
    const api = await pipApi(environment({}).env);

    // Act and assert
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 403 }));
    await expect(api.json("account", "/x")).rejects.toThrow("pip GET /x failed: 403 nope");
    fetchMock.mockResolvedValueOnce(new Response('{"ERRORED_ACCOUNTS":[{"e":1}]}'));
    await expect(api.json("account", "/add", { method: "POST", body: [] })).rejects.toThrow("pip POST /add failed: 200");
    fetchMock.mockResolvedValueOnce(new Response("created"));
    await expect(api.json("account", "/third-party", { method: "POST", body: { name: "n" } })).resolves.toBe("created");
  });
});
