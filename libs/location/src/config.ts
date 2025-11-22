import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const prismaSchemas = path.join(__dirname, "../prisma");
export const moduleRoot = __dirname;
export const apiRoutes = { path: path.join(__dirname, "routes") };
