import { createOrUpdateUser } from "@hmcts/account/repository/query";
import { trackException } from "@hmcts/cloud-native-platform";
import type { Request, Response } from "express";
import { getB2cBaseUrl, getB2cConfig, isB2cConfigured } from "../../config/b2c-config.js";
import type { UserProfile } from "../../user-profile.js";

/**
 * Handles OAuth callback from Azure B2C (GET - response_mode=query)
 */
export const GET = async (req: Request, res: Response) => {
  return handleCallback(req, res, req.query);
};

/**
 * Handles OAuth callback from Azure B2C (POST - response_mode=form_post)
 */
export const POST = async (req: Request, res: Response) => {
  return handleCallback(req, res, req.body);
};

/**
 * Common callback handler for both GET and POST
 */
async function handleCallback(req: Request, res: Response, params: any) {
  // Check if B2C is configured
  if (!isB2cConfigured()) {
    console.warn("B2C callback attempted but B2C is not configured");
    return res.status(503).send("B2C authentication is not available. Please check configuration.");
  }

  const { code, state, error, error_description } = params;

  // Handle B2C errors
  if (error) {
    // Check if user clicked "Forgot password" link in B2C sign-in page
    // B2C returns error code AADB2C90118 when this happens
    if (error_description?.includes("AADB2C90118")) {
      const locale = req.session.b2cLocale || "en";
      return res.redirect(`/b2c-forgot-password?lng=${locale}`);
    }

    console.error(`B2C authentication error: ${error} - ${error_description}`);
    return res.redirect("/sign-in?error=auth_failed");
  }

  // Validate authorization code
  if (!code || typeof code !== "string") {
    console.error("B2C callback missing authorization code");
    return res.redirect("/sign-in?error=invalid_request");
  }

  // Validate state parameter (CSRF protection)
  if (!state || typeof state !== "string") {
    console.error("B2C callback missing state parameter");
    return res.status(403).send("Invalid request: missing state parameter");
  }

  try {
    // Verify state matches session
    const stateData = Buffer.from(state, "base64").toString("utf-8");
    const [sessionId] = stateData.split(":");

    if (sessionId !== req.session.id) {
      console.error("B2C callback state mismatch");
      return res.status(403).send("Invalid request: state mismatch");
    }

    // Get provider from session
    const provider = req.session.b2cProvider;
    if (!provider) {
      console.error("B2C callback missing provider in session");
      return res.redirect("/sign-in?error=session_expired");
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, provider);

    // Extract user profile from ID token
    const userProfile = extractUserProfile(tokens.id_token, provider);

    // Create or update user in database
    try {
      await createOrUpdateUser({
        email: userProfile.email,
        userProvenance: "PI_AAD",
        userProvenanceId: userProfile.id,
        role: "VERIFIED"
      });
    } catch (error) {
      trackException(error as Error, {
        area: "B2C callback",
        userEmail: userProfile.email,
        userId: userProfile.id
      });
      return res.redirect("/sign-in?error=db_error");
    }

    // Get return URL and locale from session
    const returnTo = req.session.returnTo || "/account-home";
    const locale = req.session.b2cLocale;

    // Build redirect URL with locale if Welsh
    const redirectUrl = locale === "cy" ? `${returnTo}?lng=cy` : returnTo;

    // Clear B2C session data
    delete req.session.b2cProvider;
    delete req.session.returnTo;
    delete req.session.b2cLocale;

    // Log in user via Passport (this makes req.isAuthenticated() return true)
    req.login(userProfile, (loginErr: Error | null) => {
      if (loginErr) {
        console.error("Passport login failed:", loginErr);
        return res.redirect("/sign-in?error=login_failed");
      }

      // Initialize session activity tracking
      req.session.lastActivity = Date.now();

      // Save session before redirecting
      req.session.save((saveErr: Error | null) => {
        if (saveErr) {
          console.error("Session save failed:", saveErr);
          return res.redirect("/sign-in");
        }

        res.redirect(redirectUrl);
      });
    });
  } catch (error) {
    console.error("B2C callback error:", error);
    trackException(error as Error, {
      area: "B2C callback"
    });
    return res.redirect("/sign-in?error=auth_failed");
  }
}

/**
 * Exchanges authorization code for access and ID tokens
 * Uses client credentials flow with B2C token endpoint
 */
async function exchangeCodeForTokens(code: string, provider: string): Promise<{ access_token: string; id_token: string }> {
  const b2cConfig = getB2cConfig();

  // B2C is only used for CaTH users (HMCTS uses CFT IDAM)
  if (provider !== "cath") {
    throw new Error(`Invalid B2C provider: ${provider}. Only 'cath' is supported.`);
  }
  const policy = b2cConfig.policyCath;

  const tokenUrl = `${getB2cBaseUrl()}/oauth2/v2.0/token?p=${policy}`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: b2cConfig.clientId,
    client_secret: b2cConfig.clientSecret,
    code,
    redirect_uri: b2cConfig.redirectUri,
    scope: b2cConfig.scope.join(" ")
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Extracts user profile from B2C ID token
 * Parses JWT and extracts standard claims
 */
function extractUserProfile(idToken: string, _provider: string): UserProfile {
  // Decode JWT (basic implementation - in production use a JWT library)
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ID token format");
  }

  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));

  return {
    id: payload.sub || payload.oid,
    email: payload.email || payload.emails?.[0] || payload.signInNames?.emailAddress,
    displayName: payload.name || payload.given_name || payload.family_name || "Unknown",
    role: "VERIFIED",
    provenance: "B2C"
  };
}
