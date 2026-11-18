import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apiRoutes = { path: path.join(__dirname, "routes") };
// Routes that need the web app's session and Passport, so they are mounted by the web app only
export const webRoutes = { path: path.join(__dirname, "web-routes") };
