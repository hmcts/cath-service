import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module configuration for asset bundling
export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
export const schemaPath = path.join(__dirname, "schemas/sjp-public-list.json");
