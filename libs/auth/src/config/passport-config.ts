import type { Express } from "express";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import { fetchUserProfile } from "../graph-api/client.js";
import { determineSsoUserRole } from "../role-service/index.js";
import type { UserProfile } from "../user-profile.js";
import { getSsoConfig } from "./sso-config.js";

const STRATEGY_NAME = "azuread-openidconnect";

function initializePassport(app: Express): void {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });
}

export async function configurePassport(app: Express): Promise<void> {
  const disableSso = process.env.NODE_ENV === "development" && !process.env.ENABLE_SSO;

  if (disableSso) {
    initializePassport(app);
    return;
  }

  const ssoConfig = getSsoConfig();

  if (!ssoConfig.issuerUrl || !ssoConfig.clientId || !ssoConfig.clientSecret) {
    throw new Error("SSO configuration is incomplete. Required: SSO_ISSUER_URL, SSO_CLIENT_ID, SSO_CLIENT_SECRET");
  }

  const oidcConfig = await client.discovery(new URL(ssoConfig.issuerUrl), ssoConfig.clientId, ssoConfig.clientSecret);

  const strategy = new Strategy(
    {
      config: oidcConfig,
      name: STRATEGY_NAME,
      callbackURL: ssoConfig.redirectUri,
      scope: ssoConfig.scope.join(" ")
    },
    async (tokens, done) => {
      try {
        const claims = tokens.claims();
        const accessToken = tokens.access_token;

        if (!accessToken) {
          return done(new Error("No access token received from identity provider"), false);
        }

        const userProfile = await fetchUserProfile(accessToken);
        const userRole = determineSsoUserRole(userProfile.groupIds);

        const oid = claims?.oid as string | undefined;
        const email = (claims?.preferred_username ?? claims?.email) as string | undefined;
        const displayName = claims?.name as string | undefined;

        const user: UserProfile = {
          id: oid ?? claims?.sub ?? userProfile.id,
          email: email ?? userProfile.email,
          displayName: displayName ?? userProfile.displayName,
          role: userRole,
          provenance: "SSO"
        };

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  );

  initializePassport(app);
  passport.use(strategy);
}
