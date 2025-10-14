import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type { AssetOptions } from "./assets/assets.js";
export { createBaseViteConfig } from "./assets/vite-config.js";
export type { CookieManagerOptions, CookieManagerState, CookiePreferences } from "./cookies/cookie-manager-middleware.js";
export { configureCookieManager } from "./cookies/cookie-manager-middleware.js";
export type { GovukSetupOptions } from "./govuk-frontend/configure-govuk.js";
export { configureGovuk } from "./govuk-frontend/configure-govuk.js";
export { errorHandler, notFoundHandler } from "./govuk-frontend/error-handler.js";
export type { SecurityOptions } from "./helmet/helmet-middleware.js";
export { configureHelmet, configureNonce } from "./helmet/helmet-middleware.js";
export type { LocaleMiddlewareOptions } from "./i18n/locale-middleware.js";
export { localeMiddleware, translationMiddleware } from "./i18n/locale-middleware.js";
export type { Translations } from "./i18n/translation-loader.js";
export { getTranslation, loadTranslations } from "./i18n/translation-loader.js";
export type { ExpressSessionPostgresOptions } from "./session-stores/postgres-session.js";
export { expressSessionPostgres } from "./session-stores/postgres-session.js";
export { PostgresStore } from "./session-stores/postgres-store.js";
// Session stores - these have optional peer dependencies
export type { ExpressSessionRedisOptions } from "./session-stores/redis-store.js";
export { expressSessionRedis } from "./session-stores/redis-store.js";

// Footer pages module configuration
export const footerPageRoutes = { path: path.join(__dirname, "views") };
export const pageRoutes = { path: path.join(__dirname, "pages") };
