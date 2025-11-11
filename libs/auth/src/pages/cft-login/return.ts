import type { Request, Response } from "express";
import { exchangeCodeForToken, extractUserInfoFromToken } from "../../cft-idam/token-client.js";
import { getCftIdamConfig } from "../../config/cft-idam-config.js";
import { isRejectedCFTRole } from "../../role-service/index.js";
import type { UserProfile } from "../../user-profile.js";

export const GET = async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    console.error("CFT IDAM callback: No authorization code received");
    return res.redirect("/sign-in?error=no_code");
  }

  try {
    const config = getCftIdamConfig();

    const tokenResponse = await exchangeCodeForToken(code, config);
    const userInfo = extractUserInfoFromToken(tokenResponse);

    if (isRejectedCFTRole(userInfo.roles)) {
      console.log(`CFT IDAM user ${userInfo.id} rejected due to role: ${userInfo.roles.join(", ")}`);
      return res.redirect("/cft-rejected");
    }

    const user: UserProfile = {
      id: userInfo.id,
      email: userInfo.email,
      displayName: userInfo.displayName,
      role: "VERIFIED",
      provenance: "CFT"
    };

    console.log("CFT IDAM: Creating user session with:", {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      provenance: user.provenance
    });

    req.session.regenerate((err: Error | null) => {
      if (err) {
        console.error("CFT IDAM callback: Session regeneration failed", err);
        return res.redirect("/sign-in?error=session_failed");
      }

      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          console.error("CFT IDAM callback: Login failed", loginErr);
          return res.redirect("/sign-in?error=login_failed");
        }

        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            console.error("CFT IDAM callback: Session save failed", saveErr);
            return res.redirect("/sign-in?error=session_save_failed");
          }

          console.log("CFT IDAM: Session saved successfully");
          console.log("CFT IDAM: Session ID:", req.sessionID);
          console.log("CFT IDAM: User in session:", req.user);
          console.log("CFT IDAM: Full session data:", {
            cookie: req.session.cookie,
            passport: req.session.passport
          });

          res.redirect("/account-home");
        });
      });
    });
  } catch (error) {
    console.error("CFT IDAM callback error:", error);
    return res.redirect("/sign-in?error=auth_failed");
  }
};
