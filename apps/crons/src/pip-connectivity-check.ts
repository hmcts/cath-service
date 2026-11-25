import config from "config";

const REQUEST_TIMEOUT_MS = 10_000;

const ERROR_CATEGORY_BY_CODE: Record<string, ErrorCategory> = {
  ENOTFOUND: "DNS",
  EAI_AGAIN: "DNS",
  ECONNREFUSED: "CONNECTION",
  ETIMEDOUT: "CONNECTION",
  ECONNRESET: "CONNECTION",
  EHOSTUNREACH: "CONNECTION",
  ENETUNREACH: "CONNECTION",
  UND_ERR_CONNECT_TIMEOUT: "CONNECTION"
};

export default async function pipConnectivityCheck() {
  const { baseUrl, checkPath, credentials } = readSettings();
  const accessToken = await runStep("TOKEN", () => requestAccessToken(credentials));
  await runStep("API", () => callSdsApi(new URL(checkPath, baseUrl), accessToken));
}

function readSettings() {
  return {
    baseUrl: requireValue("PIP_API_URL", config.has("pipApi.url") ? config.get<string>("pipApi.url") : undefined),
    checkPath: requireValue("PIP_API_CHECK_PATH", process.env.PIP_API_CHECK_PATH),
    credentials: {
      tenantId: requireValue("AZURE_TENANT_ID", process.env.AZURE_TENANT_ID),
      clientId: requireValue("CATH_SERVICE_API_CLIENT_ID", process.env.CATH_SERVICE_API_CLIENT_ID),
      clientSecret: requireValue("CATH_SERVICE_API_CLIENT_SECRET", process.env.CATH_SERVICE_API_CLIENT_SECRET),
      scope: requireValue("CATH_SERVICE_API_CLIENT_SCOPE", process.env.CATH_SERVICE_API_CLIENT_SCOPE)
    }
  };
}

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`PIP connectivity check failed [CONFIG]: ${name} is required`);
  }
  return value;
}

async function runStep<T>(step: Step, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    // The original error is not attached as `cause`: fetch errors can carry request details we do not want in logs.
    throw new Error(`PIP ${step} step failed [${categorise(step, error)}]: ${summarise(error)}`);
  }
}

async function requestAccessToken(credentials: ClientCredentials): Promise<string> {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(credentials.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      scope: credentials.scope
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw httpError(response.status, `Token endpoint returned status ${response.status}${await readEntraErrorCode(response)}`);
  }

  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string" || body.access_token === "") {
    throw new Error("Token response did not contain an access token");
  }

  console.log("PIP token request OK");
  return body.access_token;
}

async function readEntraErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; error_codes?: unknown };
    const codes = Array.isArray(body.error_codes) ? ` AADSTS${body.error_codes.join(",AADSTS")}` : "";
    return typeof body.error === "string" ? ` (${body.error}${codes})` : "";
  } catch {
    return "";
  }
}

async function callSdsApi(url: URL, accessToken: string): Promise<void> {
  const startedAt = Date.now();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw httpError(response.status, `SDS API returned status ${response.status}`);
  }

  const body: unknown = await response.json();
  console.log("PIP SDS API read OK", {
    status: response.status,
    itemCount: Array.isArray(body) ? body.length : undefined,
    durationMs: Date.now() - startedAt
  });
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function categorise(step: Step, error: unknown): ErrorCategory {
  if (!(error instanceof Error)) return "UNKNOWN";

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return categoriseStatus(step, status);

  if (error.name === "TimeoutError") return "CONNECTION";

  const code = errorCode(error);
  if (code && ERROR_CATEGORY_BY_CODE[code]) return ERROR_CATEGORY_BY_CODE[code];

  return step === "TOKEN" && error.message.includes("access token") ? "TOKEN" : "UNKNOWN";
}

function categoriseStatus(step: Step, status: number): ErrorCategory {
  if (step === "TOKEN") return "TOKEN";
  if (status === 401) return "AUTH_DENIED";
  if (status === 403) return "FORBIDDEN";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "UPSTREAM";
  return "UNKNOWN";
}

function errorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code ?? (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : undefined;
}

function summarise(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = errorCode(error);
  return code ? `${code} ${error.message}` : error.message;
}

interface ClientCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

type Step = "TOKEN" | "API";

type ErrorCategory = "DNS" | "CONNECTION" | "TOKEN" | "AUTH_DENIED" | "FORBIDDEN" | "RATE_LIMITED" | "UPSTREAM" | "UNKNOWN";
