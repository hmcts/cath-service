// Load environment variables from .env file
import dotenv from "dotenv";

dotenv.config();

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

async function startServer() {
  const app = await createApp();

  // Check if we should use HTTPS (local development with certificates)
  const certsDir = path.join(__dirname, "..", "certs");
  const certPath = path.join(certsDir, "localhost.pem");
  const keyPath = path.join(certsDir, "localhost-key.pem");

  const shouldUseHttps = !IS_PRODUCTION && fs.existsSync(certPath) && fs.existsSync(keyPath);

  let server;

  if (shouldUseHttps) {
    // Use HTTPS for local development
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    server = https.createServer(httpsOptions, app);
    server.listen(PORT, () => {
      console.log(`🔒 Web server running on https://localhost:${PORT}`);
    });
  } else {
    // Use HTTP for production (SSL termination at ingress)
    server = app.listen(PORT, () => {
      console.log(`🌐 Web server running on http://localhost:${PORT}`);
    });
  }

  return server;
}

const server = await startServer();

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
