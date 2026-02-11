import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "config";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { closeLaunchDarklyClient, getLaunchDarklyClient, initLaunchDarklyClient } from "./launchdarkly-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const PORT = config.get<number>("port") || 4000;

async function startServer() {
  try {
    const sdkKey = config.has("launchDarklySdkKey") ? config.get<string>("launchDarklySdkKey") : undefined;

    if (sdkKey) {
      try {
        await initLaunchDarklyClient(sdkKey);
        console.log("LaunchDarkly client initialized");
      } catch (error) {
        console.warn("LaunchDarkly init failed, routing all traffic to old service:", error);
      }
    } else {
      console.warn("No LAUNCHDARKLY_SDK_KEY configured, routing all traffic to old service");
    }

    const ldClient = getLaunchDarklyClient();
    const app = await createApp(ldClient);

    const server = app.listen(PORT, () => {
      console.log(`Proxy server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

    const shutdown = async () => {
      console.log("Shutting down proxy server...");
      await closeLaunchDarklyClient();
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

await startServer();

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});
