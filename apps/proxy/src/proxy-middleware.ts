import { Socket } from "node:net";
import type { LDClient } from "@launchdarkly/node-server-sdk";
import type { Request, RequestHandler, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const FLAG_KEY = "cath-new-service";

interface RoutingProxyOptions {
  ldClient: LDClient | null;
  newServiceUrl: string;
  oldServiceUrl: string;
}

export function createRoutingProxy({ ldClient, newServiceUrl, oldServiceUrl }: RoutingProxyOptions): RequestHandler {
  const newServiceProxy = createProxyMiddleware({
    target: newServiceUrl,
    changeOrigin: true,
    on: {
      error: handleProxyError,
      proxyRes: (_proxyRes, _req, res) => {
        (res as Response).setHeader("x-cath-variant", "new");
      }
    }
  });

  const oldServiceProxy = createProxyMiddleware({
    target: oldServiceUrl,
    changeOrigin: true,
    on: {
      error: handleProxyError,
      proxyRes: (_proxyRes, _req, res) => {
        (res as Response).setHeader("x-cath-variant", "old");
      }
    }
  });

  return async (req, res, next) => {
    const useNewService = await evaluateFlag(ldClient, res.locals.visitorId);

    if (useNewService) {
      newServiceProxy(req, res, next);
    } else {
      oldServiceProxy(req, res, next);
    }
  };
}

async function evaluateFlag(ldClient: LDClient | null, visitorId: string): Promise<boolean> {
  if (!ldClient) {
    return false;
  }

  try {
    return await ldClient.boolVariation(FLAG_KEY, { kind: "user", key: visitorId }, false);
  } catch {
    return false;
  }
}

function handleProxyError(err: Error, _req: Request, res: Response | import("node:http").ServerResponse | Socket) {
  console.error("Proxy error:", err.message);
  if (res instanceof Socket) {
    res.destroy();
    return;
  }
  if (!res.headersSent) {
    (res as Response).status(502).send("Bad Gateway");
  }
}
