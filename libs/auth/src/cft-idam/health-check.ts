import type { Request, Response } from "express";
import { getCftIdamConfig, isCftIdamConfigured } from "../config/cft-idam-config.js";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

// Reports CFT IDAM status on /health only. Deliberately not wired into liveness/readiness
// so an IDAM outage never takes web pods out of service.
export function cftIdamHealthCheck() {
  return async (_req: Request, res: Response) => {
    if (!isCftIdamConfigured()) {
      res.json({ status: "UP", services: {} });
      return;
    }

    const { cftIdamUrl, hmctsAccessUrl } = getCftIdamConfig();
    const [cftIdam, hmctsAccess] = await Promise.all([checkStatus(`${cftIdamUrl}/health`), checkStatus(`${hmctsAccessUrl}/health`)]);
    const services = { "cft-idam": cftIdam, "hmcts-access": hmctsAccess };
    const status = cftIdam === "UP" && hmctsAccess === "UP" ? "UP" : "DOWN";

    res.status(status === "UP" ? 200 : 503).json({ status, services });
  };
}

async function checkStatus(url: string): Promise<HealthStatus> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) });
    const body = await response.json();
    return body?.status === "UP" ? "UP" : "DOWN";
  } catch {
    return "DOWN";
  }
}

type HealthStatus = "UP" | "DOWN";
