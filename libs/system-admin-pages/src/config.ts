import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const pages = { path: `${__dirname}/pages` };
export const fileUploadRoutes = ["/reference-data-upload"];
