import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const fileUploadRoutes = ["/admin/manual-upload", "/admin/non-strategic-upload"];
