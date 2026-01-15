import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const pageRoutes = {
  path: path.join(__dirname, "pages"),
  prefix: "/care-standards-tribunal-weekly-hearing-list"
};
export const assets = path.join(__dirname, "assets/");
