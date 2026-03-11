import { createOrUpdateUser } from "@hmcts/account/repository/query";
import { trackException } from "@hmcts/cloud-native-platform";
import type { Request, Response } from "express";
import { getCrimeIdamConfig } from "../../config/crime-idam-config.js";
import { exchangeCodeForToken, extractUserInfoFromToken } from "../../crime-idam/token-client.js";
import { isRejectedCrimeRole } from "../../role-service/index.js";
import type { UserProfile } from "../../user-profile.js";

export const GET = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const lng = req.session.lng || "en";

  if (!code) {
    console.error("Crime IDAM callback: No authorization code received");
    return res.redirect(`/sign-in?error=no_code&lng=${lng}`);
  }

  const state = req.query.state as string;
  const expectedState = req.session.crimeOauthState as string | undefined;
  delete req.session.crimeOauthState;

  if (!state || state !== expectedState) {
    console.error("Crime IDAM callback: OAuth state mismatch");
    return res.redirect(`/sign-in?error=invalid_state&lng=${lng}`);
  }

  try {
    const config = getCrimeIdamConfig();

    const tokenResponse = await exchangeCodeForToken(code, config);
    const userInfo = extractUserInfoFromToken(tokenResponse);

    if (isRejectedCrimeRole(userInfo.roles)) {
      return res.redirect(`/crime-rejected?lng=${lng}`);
    }

    // Create or update user record in database
    let dbUser: Awaited<ReturnType<typeof createOrUpdateUser>>;
    try {
      dbUser = await createOrUpdateUser({
        email: userInfo.email,
        firstName: userInfo.firstName,
        surname: userInfo.surname,
        userProvenance: "CRIME_IDAM",
        userProvenanceId: `CRIME_IDAM:${userInfo.id}`,
        role: "VERIFIED"
      });
    } catch (error) {
      trackException(error as Error, { area: "Crime IDAM callback" });
      return res.redirect(`/sign-in?error=db_error&lng=${lng}`);
    }

    const user: UserProfile = {
      id: dbUser.userId,
      email: userInfo.email,
      displayName: userInfo.displayName,
      role: "VERIFIED",
      provenance: "CRIME_IDAM"
    };

    req.session.regenerate((err: Error | null) => {
      if (err) {
        console.error("Crime IDAM callback: Session regeneration failed");
        return res.redirect(`/sign-in?error=session_failed&lng=${lng}`);
      }

      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          console.error("Crime IDAM callback: Login failed");
          return res.redirect(`/sign-in?error=login_failed&lng=${lng}`);
        }

        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            console.error("Crime IDAM callback: Session save failed");
            return res.redirect(`/sign-in?error=session_save_failed&lng=${lng}`);
          }

          // Clean up language from session and redirect with language parameter
          delete req.session.lng;
          res.redirect(`/account-home?lng=${lng}`);
        });
      });
    });
  } catch (error) {
    console.error("Crime IDAM callback: Authentication failed");
    const lng = req.session.lng || "en";
    return res.redirect(`/sign-in?error=auth_failed&lng=${lng}`);
  }
};
