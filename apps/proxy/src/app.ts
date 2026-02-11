import path from "node:path";
import { fileURLToPath } from "node:url";
import { configurePropertiesVolume, healthcheck } from "@hmcts/cloud-native-platform";
import type { LDClient } from "@launchdarkly/node-server-sdk";
import config from "config";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import express from "express";
import { createRoutingProxy } from "./proxy-middleware.js";
import { visitorCookie } from "./visitor-cookie.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export async function createApp(ldClient: LDClient | null): Promise<Express> {
  await configurePropertiesVolume(config, { chartPath });

  const app = express();

  app.use(healthcheck());
  app.use(cookieParser());
  app.use(visitorCookie());

  const newServiceUrl = config.get<string>("newServiceUrl") || "http://localhost:8080";
  const oldServiceUrl = config.get<string>("oldServiceUrl") || "http://localhost:3000";

  app.use(createRoutingProxy({ ldClient, newServiceUrl, oldServiceUrl }));

  return app;
}
