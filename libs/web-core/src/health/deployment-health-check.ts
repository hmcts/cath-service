import type { Request, Response } from "express";

const API_TIMEOUT_MS = 5000;
const UNKNOWN_COMMIT = "unknown";

// Which commit web and the API run, and whether web can reach the API. The PROD smoke
// test (#1099) polls this through Front Door until both match the promoted commit,
// because the API host is not reachable from the GitHub runners. Not wired into
// liveness/readiness, so an API outage never takes web pods out of service.
export function deploymentHealthCheck() {
  return async (_req: Request, res: Response) => {
    const api = await checkApi(process.env.CATH_API_URL);

    res.set("Cache-Control", "no-store");
    res.status(api.status === "UP" ? 200 : 503).json({
      status: api.status,
      gitCommit: process.env.GIT_COMMIT || UNKNOWN_COMMIT,
      services: { "cath-api": api }
    });
  };
}

async function checkApi(apiUrl: string | undefined): Promise<ServiceDeployment> {
  if (!apiUrl) {
    return { status: "DOWN", gitCommit: UNKNOWN_COMMIT };
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/`, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
    if (!response.ok) {
      return { status: "DOWN", gitCommit: UNKNOWN_COMMIT };
    }
    const body = await response.json();
    return { status: "UP", gitCommit: typeof body?.gitCommit === "string" ? body.gitCommit : UNKNOWN_COMMIT };
  } catch {
    return { status: "DOWN", gitCommit: UNKNOWN_COMMIT };
  }
}

interface ServiceDeployment {
  status: "UP" | "DOWN";
  gitCommit: string;
}
