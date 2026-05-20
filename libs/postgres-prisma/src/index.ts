import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

console.log("[PRISMA] ========== STARTING INITIALIZATION ==========");
console.log("[PRISMA] Current working directory:", process.cwd());
console.log("[PRISMA] All environment variable types:");
const allEnvKeys = Object.keys(process.env);
for (const key of allEnvKeys) {
  const val = process.env[key];
  if (key.includes("DATABASE") || key.includes("PG") || key.includes("POSTGRES")) {
    console.log(`[PRISMA]   ${key}:`, typeof val, Array.isArray(val) ? "[ARRAY]" : typeof val === "object" ? "[OBJECT]" : val?.substring(0, 50));
  }
}

// Construct DATABASE_URL from individual env vars if available
if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_PORT && process.env.POSTGRES_DATABASE) {
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_DATABASE } = process.env;
  console.log("[PRISMA] Building DATABASE_URL from POSTGRES_* vars");
  console.log("[PRISMA]   POSTGRES_HOST type:", typeof POSTGRES_HOST);
  console.log("[PRISMA]   POSTGRES_USER type:", typeof POSTGRES_USER);
  console.log("[PRISMA]   POSTGRES_PASSWORD type:", typeof POSTGRES_PASSWORD);
  console.log("[PRISMA]   POSTGRES_PORT type:", typeof POSTGRES_PORT);
  console.log("[PRISMA]   POSTGRES_DATABASE type:", typeof POSTGRES_DATABASE);

  process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=require`;
  console.log("[PRISMA] Built DATABASE_URL type:", typeof process.env.DATABASE_URL);
}

process.env.DATABASE_URL ??= "postgresql://hmcts@localhost:5433/postgres";
console.log("[PRISMA] Final DATABASE_URL type:", typeof process.env.DATABASE_URL);
console.log("[PRISMA] Final DATABASE_URL value:", process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 40)}...` : "undefined");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create connection pool with connectionString (let pg parse it)
console.log("[PRISMA] Creating pg.Pool...");
const poolConfig = {
  connectionString: process.env.DATABASE_URL
};
console.log("[PRISMA] Pool config connectionString type:", typeof poolConfig.connectionString);
console.log("[PRISMA] Pool config:", JSON.stringify({ connectionString: poolConfig.connectionString?.substring(0, 40) + "..." }));

const pool = new pg.Pool(poolConfig);

// Log pool internals
console.log("[PRISMA] Pool created. Internal config:");
console.log("[PRISMA]   pool.options:", JSON.stringify(pool.options, null, 2));

// Add connection event handlers
pool.on("connect", (client) => {
  console.log("[PRISMA] Pool 'connect' event fired");
  const params = (client as any).connectionParameters;
  if (params) {
    console.log("[PRISMA] Client connectionParameters types:");
    for (const [key, val] of Object.entries(params)) {
      console.log(`[PRISMA]     ${key}:`, typeof val, Array.isArray(val) ? "[ARRAY]" : typeof val === "object" && val !== null ? JSON.stringify(val) : String(val).substring(0, 50));
    }
  }
});

pool.on("error", (err) => {
  console.error("[PRISMA] Pool error:", err);
});

// Create driver adapter
console.log("[PRISMA] Creating PrismaPg adapter...");
const adapter = new PrismaPg(pool);
console.log("[PRISMA] Adapter created, type:", typeof adapter);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

console.log("[PRISMA] ========== INITIALIZATION COMPLETE ==========");

export type { PrismaClient } from "../generated/prisma/client.js";
export * from "../generated/prisma/client.js";
