import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const apiRoutes = { path: path.join(__dirname, "routes") };
export const assets = path.join(__dirname, "assets/");
export const moduleRoot = __dirname;
export const fileUploadRoutes = ["/reference-data-upload"];
