import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env file manually since Prisma config doesn't auto-load it
const envPath = path.join(import.meta.dirname || ".", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    // Skip empty lines and comments
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex > 0) {
      const key = trimmedLine.substring(0, separatorIndex).trim();
      const value = trimmedLine
        .substring(separatorIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key) {
        process.env[key] = value;
      }
    }
  }
}

export default defineConfig({
  schema: path.join("dist", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations")
  }
});
