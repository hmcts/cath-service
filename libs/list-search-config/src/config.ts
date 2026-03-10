import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module configuration for app registration
export const prismaSchemas = path.join(__dirname, "../prisma");
