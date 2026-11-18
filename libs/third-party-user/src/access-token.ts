import type { OauthConfig } from "./oauth-config.js";
import { discardBody, type RequestFailure, readJsonBody, sendOutboundRequest } from "./outbound-request.js";

export async function requestAccessToken(config: OauthConfig): Promise<AccessTokenResult> {
  const result = await sendOutboundRequest(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: config.scope
    }).toString()
  });

  if (result.kind !== "response") {
    return result;
  }

  if (!result.response.ok) {
    await discardBody(result.response);
    return { kind: "http-status", status: result.status };
  }

  const body = await readJsonBody(result.response);
  if (body.kind === "timeout") {
    return body;
  }

  const accessToken = body.kind === "json" ? extractAccessToken(body.body) : undefined;
  return accessToken ? { kind: "token", accessToken } : { kind: "invalid-token-response" };
}

function extractAccessToken(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("access_token" in body)) {
    return undefined;
  }
  return typeof body.access_token === "string" && body.access_token !== "" ? body.access_token : undefined;
}

export type AccessTokenResult =
  | { kind: "token"; accessToken: string }
  | { kind: "http-status"; status: number }
  | { kind: "invalid-token-response" }
  | RequestFailure;
