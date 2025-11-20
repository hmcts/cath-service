import path from "node:path";
import { defineConfig } from "prisma/config";

import "dotenv/config";

export default defineConfig({
  schema: path.join("dist", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations")
  },
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
