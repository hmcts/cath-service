export type { AssetOptions } from "./assets/assets.js";
export { createBaseViteConfig } from "./assets/vite-config.js";
export type { CookieManagerOptions, CookieManagerState, CookiePreferences } from "./middleware/cookies/cookie-manager-middleware.js";
export { configureCookieManager } from "./middleware/cookies/cookie-manager-middleware.js";
export type { GovukSetupOptions } from "./middleware/govuk-frontend/configure-govuk.js";
export { configureGovuk } from "./middleware/govuk-frontend/configure-govuk.js";
export { errorHandler, notFoundHandler } from "./middleware/govuk-frontend/error-handler.js";
export type { SecurityOptions } from "./middleware/helmet/helmet-middleware.js";
export { configureHelmet, configureNonce } from "./middleware/helmet/helmet-middleware.js";
export type { LocaleMiddlewareOptions } from "./middleware/i18n/locale-middleware.js";
export { localeMiddleware, translationMiddleware } from "./middleware/i18n/locale-middleware.js";
export type { Translations } from "./middleware/i18n/translation-loader.js";
export { getTranslation, loadTranslations } from "./middleware/i18n/translation-loader.js";
export type { ExpressSessionPostgresOptions } from "./middleware/session-stores/postgres-session.js";
export { expressSessionPostgres } from "./middleware/session-stores/postgres-session.js";
export { PostgresStore } from "./middleware/session-stores/postgres-store.js";
// Session stores - these have optional peer dependencies
export type { ExpressSessionRedisOptions } from "./middleware/session-stores/redis-store.js";
export { expressSessionRedis } from "./middleware/session-stores/redis-store.js";
