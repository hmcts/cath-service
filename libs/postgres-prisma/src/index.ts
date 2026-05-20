// import { PrismaPg } from "@prisma/adapter-pg";
// import pg from "pg";
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

console.log("[PRISMA] Creating Prisma client WITHOUT adapter (testing)...");
console.log("[PRISMA] DATABASE_URL type:", typeof process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Remove adapter temporarily to test if that's the issue
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

console.log("[PRISMA] Prisma client initialized successfully");

export type { PrismaClient } from "../generated/prisma/client.js";
export * from "../generated/prisma/client.js";
