import type { Environment, PipApiClient } from "../environments.js";

// pip's data-management and account-management APIs, as the seeders and the cleanup call them. A
// local pip runs in dev mode: no token, and any UUID as the requester. A deployed one wants a
// client-credentials token per API (environments.json pip.api) and, for most writes, a requester
// who is a pip system admin, which the recording creates for itself (pip/seed.ts).
const LOCAL_DATA_MANAGEMENT_URL = "http://localhost:18090";
const LOCAL_ACCOUNT_MANAGEMENT_URL = "http://localhost:16969";
export const LOCAL_REQUESTER_ID = "00000000-0000-4000-8000-000000000001";

export async function pipApi(environment: Environment): Promise<PipApi> {
  const { pip } = environment;
  const urls: Record<PipService, string> = {
    data: process.env.PIP_DATA_MANAGEMENT_URL ?? pip.dataManagementUrl ?? LOCAL_DATA_MANAGEMENT_URL,
    account: process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? pip.accountManagementUrl ?? LOCAL_ACCOUNT_MANAGEMENT_URL
  };
  const tokens = pip.api ? await apiTokens(environment, pip.api) : null;
  return client(urls, tokens, LOCAL_REQUESTER_ID);
}

function client(urls: Record<PipService, string>, tokens: Record<PipService, string> | null, requesterId: string): PipApi {
  const request = (service: PipService, endpoint: string, init: RawRequest = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(init.requester === false ? {} : { "x-requester-id": requesterId }),
      ...(tokens ? { authorization: `Bearer ${tokens[service]}` } : {}),
      ...init.headers
    };
    return fetch(`${urls[service]}${endpoint}`, { method: init.method ?? "GET", headers, body: init.body });
  };

  return {
    deployed: !!tokens,
    urls,
    request,
    requesterId,
    asRequester: (id) => client(urls, tokens, id),
    json: async (service, endpoint, init = {}) => {
      const isForm = init.body instanceof FormData;
      const body = init.body === undefined || isForm || typeof init.body === "string" ? (init.body as BodyInit | undefined) : JSON.stringify(init.body);
      const response = await request(service, endpoint, {
        ...init,
        body,
        headers: { ...(body && !isForm ? { "content-type": "application/json" } : {}), ...init.headers }
      });
      const text = await response.text();
      if (!response.ok || text.includes('"ERRORED_ACCOUNTS":[{'))
        throw new Error(`pip ${init.method ?? "GET"} ${endpoint} failed: ${response.status} ${text.slice(0, 300)}`);
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  };
}

async function apiTokens(environment: Environment, api: NonNullable<Environment["pip"]["api"]>): Promise<Record<PipService, string>> {
  const vault = { ...environment.pip, keyVault: api.keyVault };
  const secret = async (name: string) => {
    const value = await environment.secret(vault, name);
    if (!value) throw new Error(`no ${name} in ${api.keyVault} (or ${name.toUpperCase().replace(/-/g, "_")}) to call pip's APIs with`);
    return value;
  };
  const tenantId = await secret(api.tenantId);
  const token = async (client: PipApiClient) => {
    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: await secret(client.clientId),
        client_secret: await secret(client.clientSecret),
        scope: `${await secret(client.scope)}/.default`,
        grant_type: "client_credentials"
      })
    });
    // The body can echo the request, so only the status is reported
    if (!response.ok) throw new Error(`Entra ID refused a token for pip (${client.clientId}): ${response.status}`);
    return ((await response.json()) as { access_token: string }).access_token;
  };
  return { data: await token(api.dataManagement), account: await token(api.accountManagement) };
}

export type PipService = "data" | "account";

export interface RawRequest {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  // false to send no x-requester-id
  requester?: boolean;
}

// A JSON request: an object body is sent as JSON, a form or a string as it is
export interface PipRequest extends Omit<RawRequest, "body"> {
  body?: unknown;
}

export interface PipApi {
  // A deployed pip, called with tokens
  deployed: boolean;
  urls: Record<PipService, string>;
  request: (service: PipService, endpoint: string, init?: RawRequest) => Promise<Response>;
  // The JSON (or text) of a successful response; anything else throws
  json: (service: PipService, endpoint: string, init?: PipRequest) => Promise<unknown>;
  // The pip user requests are made as
  requesterId: string;
  // The same API, making requests as another pip user
  asRequester: (userId: string) => PipApi;
}
