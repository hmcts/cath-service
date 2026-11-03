import { type AccessTokenResult, requestAccessToken } from "./access-token.js";
import { getOauthConfig } from "./oauth-config.js";
import { discardBody, type RequestFailure, sendOutboundRequest } from "./outbound-request.js";

export async function testThirdPartyConnection(userId: string): Promise<ConnectionTestResult> {
  try {
    const config = await getOauthConfig(userId);
    if (!config) {
      logFailure(userId, "missing-configuration", "no-oauth-configuration");
      return { status: "missing-configuration" };
    }

    const token = await requestAccessToken(config);
    if (token.kind !== "token") {
      return toFailureResult(userId, "token", token);
    }

    const destination = await requestDestination(config.destinationUrl, token.accessToken);
    if (destination.kind !== "success") {
      return toFailureResult(userId, "destination", destination);
    }

    return { status: "success" };
  } catch (error) {
    logFailure(userId, "error", "unexpected", error instanceof Error ? error.name : undefined);
    return { status: "error" };
  }
}

async function requestDestination(destinationUrl: string, accessToken: string): Promise<DestinationResult> {
  const result = await sendOutboundRequest(destinationUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (result.kind !== "response") {
    return result;
  }

  await discardBody(result.response);
  return result.response.ok ? { kind: "success" } : { kind: "http-status", status: result.status };
}

function toFailureResult(userId: string, stage: "token" | "destination", failure: StageFailure): ConnectionTestResult {
  if (failure.kind === "timeout") {
    logFailure(userId, stage, "timeout");
    return { status: "error" };
  }

  const reason = toFailureReason(failure);
  logFailure(userId, stage, describeReason(reason), failure.kind === "network-error" ? failure.code : undefined);
  return stage === "token" ? { status: "token-failure", reason } : { status: "destination-failure", reason };
}

function toFailureReason(failure: Exclude<StageFailure, { kind: "timeout" }>): FailureReason {
  switch (failure.kind) {
    case "http-status":
      return { kind: "http-status", status: failure.status };
    case "invalid-token-response":
      return { kind: "invalid-token-response" };
    case "invalid-url":
      return { kind: "invalid-url" };
    case "network-error":
      return { kind: "connection-failed" };
  }
}

function describeReason(reason: FailureReason): string {
  return reason.kind === "http-status" ? `http-status-${reason.status}` : reason.kind;
}

function logFailure(userId: string, stage: string, reason: string, code?: string): void {
  const codeSuffix = code ? ` code=${code}` : "";
  console.error(`Third party connection test failed: userId=${userId} stage=${stage} reason=${reason}${codeSuffix}`);
}

type DestinationResult = { kind: "success" } | { kind: "http-status"; status: number } | RequestFailure;

type StageFailure = Exclude<AccessTokenResult, { kind: "token" }> | Exclude<DestinationResult, { kind: "success" }>;

export type FailureReason =
  | { kind: "http-status"; status: number }
  | { kind: "invalid-token-response" }
  | { kind: "invalid-url" }
  | { kind: "connection-failed" };

export type ConnectionTestResult =
  | { status: "success" }
  | { status: "missing-configuration" }
  | { status: "token-failure"; reason: FailureReason }
  | { status: "destination-failure"; reason: FailureReason }
  | { status: "error" };
