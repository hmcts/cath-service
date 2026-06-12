import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const schemaPath = path.join(__dirname, "schemas/rcj-standard-daily-cause-list.json");
