import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { getManualUpload, storeManualUpload } from "./manual-upload/storage.js";

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const moduleRoot = __dirname;
