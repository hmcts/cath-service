import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

// Construct DATABASE_URL from individual env vars if available
if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_PORT && process.env.POSTGRES_DATABASE) {
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_DATABASE } = process.env;
  process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=require`;
  console.log("[PRISMA] Built DATABASE_URL from individual POSTGRES_* env vars");
}

process.env.DATABASE_URL ??= "postgresql://hmcts@localhost:5433/postgres";

console.log("[PRISMA] Initializing Prisma client");
console.log("[PRISMA] DATABASE_URL:", process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : "not set");
console.log("[PRISMA] DATABASE_URL type:", typeof process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create connection pool
console.log("[PRISMA] Creating pg connection pool...");
console.log("[PRISMA] Connection string type:", typeof process.env.DATABASE_URL);
console.log("[PRISMA] Connection string value:", process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : "undefined");

// Check all POSTGRES_* env vars that might interfere
console.log("[PRISMA] Environment variables:");
console.log("[PRISMA]   POSTGRES_HOST:", typeof process.env.POSTGRES_HOST, process.env.POSTGRES_HOST);
console.log("[PRISMA]   POSTGRES_USER:", typeof process.env.POSTGRES_USER, process.env.POSTGRES_USER);
console.log("[PRISMA]   POSTGRES_PASSWORD:", typeof process.env.POSTGRES_PASSWORD, process.env.POSTGRES_PASSWORD ? "[REDACTED]" : undefined);
console.log("[PRISMA]   POSTGRES_PORT:", typeof process.env.POSTGRES_PORT, process.env.POSTGRES_PORT);
console.log("[PRISMA]   POSTGRES_DATABASE:", typeof process.env.POSTGRES_DATABASE, process.env.POSTGRES_DATABASE);
console.log("[PRISMA]   PGHOST:", typeof process.env.PGHOST, process.env.PGHOST);
console.log("[PRISMA]   PGUSER:", typeof process.env.PGUSER, process.env.PGUSER);
console.log("[PRISMA]   PGPASSWORD:", typeof process.env.PGPASSWORD, process.env.PGPASSWORD ? "[REDACTED]" : undefined);
console.log("[PRISMA]   PGPORT:", typeof process.env.PGPORT, process.env.PGPORT);
console.log("[PRISMA]   PGDATABASE:", typeof process.env.PGDATABASE, process.env.PGDATABASE);

let pool: pg.Pool;
let adapter: PrismaPg;

try {
  // Validate DATABASE_URL before creating pool
  if (typeof process.env.DATABASE_URL !== "string") {
    throw new Error(`DATABASE_URL must be a string, got: ${typeof process.env.DATABASE_URL}`);
  }

  const poolConfig = {
    connectionString: process.env.DATABASE_URL
  };
  console.log("[PRISMA] Pool config:", JSON.stringify(poolConfig, null, 2));

  // Log any PG* environment variables that pg.Pool might auto-read
  const pgEnvVars = Object.keys(process.env).filter((k) => k.startsWith("PG"));
  console.log("[PRISMA] PG* environment variables found:", pgEnvVars);
  for (const key of pgEnvVars) {
    const value = process.env[key];
    console.log(`[PRISMA]   ${key}:`, typeof value, typeof value === "object" ? JSON.stringify(value) : value);
  }

  // Parse connectionString manually to avoid any object conversion issues
  const url = new URL(process.env.DATABASE_URL);
  const poolOptions = {
    host: url.hostname,
    port: Number.parseInt(url.port || "5432", 10),
    database: url.pathname.slice(1), // Remove leading /
    user: url.username || undefined,
    password: url.password || undefined,
    // Include SSL mode if present in query params
    ...(url.searchParams.get("sslmode") === "require" ? { ssl: { rejectUnauthorized: false } } : {})
  };

  console.log("[PRISMA] Parsed pool options:", {
    host: poolOptions.host,
    port: poolOptions.port,
    database: poolOptions.database,
    user: poolOptions.user,
    password: poolOptions.password ? "[REDACTED]" : undefined,
    ssl: poolOptions.ssl ? "enabled" : "disabled"
  });

  // Create pool with explicit parsed params instead of connectionString
  pool = new pg.Pool(poolOptions);
  console.log("[PRISMA] Connection pool created successfully");

  // Add event handlers to the pool for debugging
  pool.on("error", (err) => {
    console.error("[PRISMA] Pool error on idle client:", err);
    console.error("[PRISMA] At error - DATABASE_URL type:", typeof process.env.DATABASE_URL);
  });

  pool.on("acquire", () => {
    console.log("[PRISMA] Pool acquired client");
  });

  pool.on("connect", () => {
    console.log("[PRISMA] Pool created new connection");
    console.log("[PRISMA] Total connections:", pool.totalCount, "Idle:", pool.idleCount);
  });

  // Create driver adapter
  console.log("[PRISMA] Creating Prisma adapter...");
  console.log("[PRISMA] Pool internal config:", {
    options: pool.options,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
  adapter = new PrismaPg(pool);
  console.log("[PRISMA] Adapter created successfully");
  console.log("[PRISMA] Adapter type:", typeof adapter);
} catch (error) {
  console.error("[PRISMA] Failed to initialize Prisma:");
  console.error("[PRISMA] Error type:", error?.constructor?.name);
  console.error("[PRISMA] Error message:", error instanceof Error ? error.message : String(error));
  console.error("[PRISMA] Error stack:", error instanceof Error ? error.stack : "No stack");
  console.error("[PRISMA] DATABASE_URL at error:", process.env.DATABASE_URL);
  console.error("[PRISMA] DATABASE_URL type at error:", typeof process.env.DATABASE_URL);
  throw error;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

console.log("[PRISMA] Prisma client initialized successfully");

export type { PrismaClient } from "../generated/prisma/client.js";
export * from "../generated/prisma/client.js";
