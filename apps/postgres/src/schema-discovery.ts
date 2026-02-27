// Schema discovery functionality for module integration
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getPrismaSchemas(): string[] {
  const libsDir = path.join(__dirname, "../../../libs");

  return [
    path.join(libsDir, "subscription/prisma"),
    path.join(libsDir, "subscription-list-types/prisma"),
    path.join(libsDir, "location/prisma"),
    path.join(libsDir, "notifications/prisma"),
    path.join(libsDir, "list-search-config/prisma"),
    path.join(libsDir, "audit-log/prisma")
  ];
}
