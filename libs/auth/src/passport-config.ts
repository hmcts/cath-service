import type { Express } from "express";
import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import { fetchUserProfile } from "./graph-client.js";
import { determineUserRole } from "./role-service.js";
import { getSsoConfig } from "./sso-config.js";
import type { UserProfile } from "./types.js";

interface AzureProfile {
  oid: string;
  upn?: string;
  email?: string;
  name?: string;
  _json?: {
    oid: string;
    email?: string;
    name?: string;
  };
}

interface TokenSet {
  accessToken?: string;
}

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
      done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
      done(null, user);
    });

    return;
  }

  const ssoConfig = getSsoConfig();

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Azure AD OIDC Strategy
  try {
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

            // Merge profile data
            const user: UserProfile = {
              id: profile.oid || userProfile.id,
              email: profile.upn || profile.email || profile._json?.email || userProfile.email,
              displayName: profile.name || profile._json?.name || userProfile.displayName,
              roles: userProfile.roles,
              groupIds: userProfile.groupIds,
              role: userRole,
              accessToken
            };

            return done(null, user);
          } catch (error) {
            console.error("Error in Azure AD authentication:", error);
            return done(error, false);
          }
        }
      )
    );
  } catch (error) {
    console.error("[Passport] Error creating OIDC Strategy:", error);
    throw error;
  }

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });
}
