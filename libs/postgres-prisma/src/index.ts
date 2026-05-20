import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

console.log("[PRISMA-INIT] ==================== START ====================");
console.log("[PRISMA-INIT] Module load timestamp:", new Date().toISOString());
console.log("[PRISMA-INIT] Stack trace:", new Error().stack?.split("\n").slice(1, 5).join("\n"));

// Log ALL environment variables that might affect postgres
console.log("[PRISMA-INIT] Environment variables check:");
const relevantKeys = Object.keys(process.env).filter((k) => k.includes("DATABASE") || k.includes("POSTGRES") || k.startsWith("PG"));
for (const key of relevantKeys) {
  const val = process.env[key];
  console.log(`[PRISMA-INIT]   ${key}:`, {
    type: typeof val,
    isArray: Array.isArray(val),
    isObject: typeof val === "object" && val !== null,
    value: key.includes("PASSWORD") ? "[REDACTED]" : typeof val === "string" ? val.substring(0, 50) : JSON.stringify(val)
  });
}

// Construct DATABASE_URL from individual env vars if available
if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_PORT && process.env.POSTGRES_DATABASE) {
  console.log("[PRISMA-INIT] Building DATABASE_URL from POSTGRES_* vars");
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_DATABASE } = process.env;
  process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=require`;
  console.log("[PRISMA-INIT] Built DATABASE_URL type:", typeof process.env.DATABASE_URL);
}

process.env.DATABASE_URL ??= "postgresql://hmcts@localhost:5433/postgres";
console.log("[PRISMA-INIT] Final DATABASE_URL type:", typeof process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create connection pool
console.log("[PRISMA-INIT] Creating pg.Pool with config:");
const poolConfig = {
  connectionString: process.env.DATABASE_URL
};
console.log("[PRISMA-INIT]   connectionString type:", typeof poolConfig.connectionString);
console.log("[PRISMA-INIT]   connectionString isObject:", typeof poolConfig.connectionString === "object");

const pool = new pg.Pool(poolConfig);

// Hook into pool's internal connection creation
pool.on("connect", (client) => {
  console.log("[PRISMA-POOL] 'connect' event - new client created");

  // Access connection parameters
  const params = (client as any).connectionParameters;
  if (params) {
    console.log("[PRISMA-POOL] Client connectionParameters:");
    for (const [key, value] of Object.entries(params)) {
      console.log(`[PRISMA-POOL]   ${key}:`, {
        type: typeof value,
        isArray: Array.isArray(value),
        isObject: typeof value === "object" && value !== null,
        value: key === "password" ? "[REDACTED]" : typeof value === "string" ? value : JSON.stringify(value)
      });
    }
  }
});

pool.on("error", (err, client) => {
  console.error("[PRISMA-POOL] Pool error:", err.message);
  console.error("[PRISMA-POOL] Error stack:", err.stack);
});

// Create driver adapter
console.log("[PRISMA-INIT] Creating PrismaPg adapter");
const adapter = new PrismaPg(pool);
console.log("[PRISMA-INIT] Adapter created");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

console.log("[PRISMA-INIT] Prisma client created");
console.log("[PRISMA-INIT] ==================== END ====================");

export type { PrismaClient } from "../generated/prisma/client.js";
export * from "../generated/prisma/client.js";
