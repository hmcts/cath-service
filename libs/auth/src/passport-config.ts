import type { Express } from "express";
import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import { fetchUserProfile } from "./graph-client.js";
import { determineUserRole } from "./role-service.js";
import { getSsoConfig } from "./sso-config.js";
import type { UserProfile } from "./types.js";

/**
 * Configures Passport with Azure AD OIDC Strategy
 * @param app - Express application instance
 */
export function configurePassport(app: Express): void {
  // Check if SSO should be disabled for local development
  const disableSso = process.env.NODE_ENV === "development" && !process.env.ENABLE_SSO;

  if (disableSso) {
    // Initialize passport with minimal configuration (no OIDC strategy)
    app.use(passport.initialize());
    app.use(passport.session());

    // Simple serialization for dev mode
    passport.serializeUser((user, done) => {
      const sessionData = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
      console.log("📝 Session data:", JSON.stringify(sessionData, null, 2));
      done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
      const sessionData = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
      console.log("🔓 Session data:", JSON.stringify(sessionData, null, 2));
      done(null, user);
    });

    return;
  }

  const ssoConfig = getSsoConfig();

  // Check if SSO configuration is complete (e.g., for E2E tests or environments without SSO setup)
  if (!ssoConfig.identityMetadata || !ssoConfig.clientId || !ssoConfig.clientSecret) {
    // Initialize passport with minimal configuration (no OIDC strategy)
    app.use(passport.initialize());
    app.use(passport.session());

    // Simple serialization
    passport.serializeUser((user, done) => {
      const sessionData = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
      console.log("📝 Session data:", JSON.stringify(sessionData, null, 2));
      done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
      const sessionData = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
      console.log("🔓 Session data:", JSON.stringify(sessionData, null, 2));
      done(null, user);
    });

    return;
  }

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(
    new OIDCStrategy(
      {
        identityMetadata: ssoConfig.identityMetadata,
        clientID: ssoConfig.clientId,
        clientSecret: ssoConfig.clientSecret,
        redirectUrl: ssoConfig.redirectUri,
        allowHttpForRedirectUrl: ssoConfig.allowHttpForRedirectUrl,
        responseType: ssoConfig.responseType,
        responseMode: ssoConfig.responseMode,
        scope: ssoConfig.scope,
        passReqToCallback: false,
        validateIssuer: false,
        clockSkew: 300
      },
      async (_iss: any, _sub: any, profile: any, accessToken: any, _refreshToken: any, done: any) => {
        try {
          // Fetch user details and roles from Microsoft Graph API
          const userProfile = await fetchUserProfile(accessToken);

          // Determine user role based on group memberships
          const userRole = determineUserRole(userProfile.groupIds);

          // Merge profile data (only store essential fields for session)
          const user: UserProfile = {
            id: profile.oid || userProfile.id,
            email: profile.upn || profile.email || profile._json?.email || userProfile.email,
            displayName: profile.name || profile._json?.name || userProfile.displayName,
            role: userRole
          };

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    const sessionData = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
    console.log("📝 Session data:", JSON.stringify(sessionData, null, 2));
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user: Express.User, done) => {
    const sessionData = { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
    console.log("🔓 Session data:", JSON.stringify(sessionData, null, 2));
    done(null, user);
  });
}
