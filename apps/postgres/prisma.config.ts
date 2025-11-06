import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env file manually since Prisma config doesn't auto-load it
const envPath = path.join(import.meta.dirname || ".", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  schema: path.join("dist", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations")
  }
});
