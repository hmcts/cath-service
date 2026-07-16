// Business logic exports
export { USER_ROLES } from "@hmcts/account";
export {
  type CftIdamUserInfo,
  exchangeCodeForToken,
  extractUserInfoFromToken
} from "./cft-idam/token-client.js";
export { getB2cBaseUrl, getB2cConfig, isB2cConfigured } from "./config/b2c-config.js";
export { getCftIdamConfig, isCftIdamConfigured } from "./config/cft-idam-config.js";
export { getCrimeIdamConfig, isCrimeIdamConfigured } from "./config/crime-idam-config.js";
export { configurePassport } from "./config/passport-config.js";
export { getSsoConfig, isSsoConfigured } from "./config/sso-config.js";
export {
  type CrimeIdamUserInfo,
  exchangeCodeForToken as exchangeCrimeCodeForToken,
  extractUserInfoFromToken as extractCrimeUserInfoFromToken
} from "./crime-idam/token-client.js";
export { createMediaUser, findUserByEmail, getGraphApiAccessToken, updateMediaUser } from "./graph-api/client.js";
export { requireAuth } from "./middleware/authenticate.js";
export { blockUserAccess, requireRole } from "./middleware/authorise.js";
export { authNavigationMiddleware } from "./middleware/navigation.js";
export { buildNavigationItems, buildVerifiedUserNavigation } from "./middleware/navigation-helper.js";
export { sessionTimeoutMiddleware } from "./middleware/session-timeout.js";
export { isRejectedCFTRole, isRejectedCrimeRole } from "./role-service/index.js";
export { getTimeoutConfig, isSessionExpired, updateLastActivity } from "./session/timeout-tracker.js";
export type { UserProfile } from "./user-profile.js";
