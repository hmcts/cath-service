import type { Express } from "express";
import * as oidcClient from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import { fetchUserProfile } from "../graph-api/client.js";
import { determineSsoUserRole } from "../role-service/index.js";
import type { UserProfile } from "../user-profile.js";
import { getSsoConfig } from "./sso-config.js";

async function verifyOidcCallback(tokens: any, done: any): Promise<void> {
  try {
    const claims = (tokens.claims() ?? {}) as Record<string, any>;
    const userProfile = await fetchUserProfile(tokens.access_token);
    const userRole = determineSsoUserRole(userProfile.groupIds);

    const user: UserProfile = {
      id: claims.oid || userProfile.id,
      email: claims.preferred_username || claims.email || userProfile.email,
      displayName: claims.name || userProfile.displayName,
      role: userRole,
      provenance: "SSO"
    };

    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}

/**
 * Configures Passport with an openid-client OIDC Strategy for Azure AD SSO
 * @param app - Express application instance
 */
export async function configurePassport(app: Express): Promise<void> {
  const disableSso = process.env.NODE_ENV === "development" && !process.env.ENABLE_SSO;

  if (disableSso) {
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
      done(null, user);
    });

    return;
  }

  const ssoConfig = getSsoConfig();

  if (!ssoConfig.issuerUrl || !ssoConfig.clientId || !ssoConfig.clientSecret) {
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
      done(null, user);
    });

    return;
  }

  const oidcConfig = await oidcClient.discovery(new URL(ssoConfig.issuerUrl), ssoConfig.clientId, ssoConfig.clientSecret);

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    "sso-oidc",
    new Strategy(
      {
        config: oidcConfig,
        callbackURL: ssoConfig.redirectUri,
        scope: "openid profile email"
      },
      verifyOidcCallback
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });
}
