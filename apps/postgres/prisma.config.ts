import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_PORT && process.env.POSTGRES_DATABASE) {
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_DATABASE } = process.env;
  process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=require`;
}

process.env.DATABASE_URL ??= "postgresql://hmcts@localhost:5433/postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(__dirname, "../../libs/postgres-prisma/prisma/schema"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations")
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
