import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  return new PrismaClient({
    adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
