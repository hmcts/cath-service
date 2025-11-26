import config from "config";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const REQUIRED_ROLE = "api.publisher.user";

/**
 * Middleware to authenticate API requests using OAuth 2.0
 * Validates bearer token and checks for required app role
 */
export function authenticateApi() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Missing or invalid Authorization header"
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Validate token and extract claims
      const claims = await validateToken(token);

      // Check for required app role
      if (!hasRequiredRole(claims, REQUIRED_ROLE)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions. Required role: api.publisher.user"
        });
      }

      // Attach claims to request for downstream use
      (req as any).apiUser = {
        appId: claims.appid || claims.azp,
        roles: claims.roles || []
      };

      next();
    } catch (error) {
      console.error("API authentication error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  };
}

async function validateToken(token: string): Promise<any> {
  // Try to get from config (Key Vault), fallback to environment variables
  let tenantId: string | undefined;
  let clientId: string | undefined;

  try {
    tenantId = config.get<string>("AZURE_TENANT_ID");
    clientId = config.get<string>("AZURE_CLIENT_ID");
  } catch {
    // Config not found, use environment variables
    tenantId = process.env.AZURE_TENANT_ID;
    clientId = process.env.AZURE_CLIENT_ID;
  }

  if (!tenantId || !clientId) {
    throw new Error("Azure AD configuration not found. Ensure AZURE_TENANT_ID and AZURE_CLIENT_ID are set in Key Vault or environment variables.");
  }

  // Create JWKS client to fetch Azure AD public keys
  const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 86400000, // Cache keys for 24 hours
    rateLimit: true
  });

  return new Promise((resolve, reject) => {
    // Decode token to get kid (key ID) without verification
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded === "string") {
      return reject(new Error("Invalid token format"));
    }

    const kid = decoded.header.kid;
    if (!kid) {
      return reject(new Error("Token missing kid (key ID) in header"));
    }

    // Get signing key from Azure AD
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) {
        return reject(new Error(`Failed to fetch signing key: ${err?.message || "Key not found"}`));
      }

      const signingKey = key.getPublicKey();

      // Verify token signature and validate claims
      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ["RS256"],
          issuer: [`https://login.microsoftonline.com/${tenantId}/v2.0`, `https://sts.windows.net/${tenantId}/`],
          audience: clientId
        },
        (verifyErr, decodedToken) => {
          if (verifyErr) {
            return reject(new Error(`Token verification failed: ${verifyErr.message}`));
          }

          resolve(decodedToken);
        }
      );
    });
  });
}

function hasRequiredRole(claims: any, requiredRole: string): boolean {
  const roles = claims.roles || [];
  return Array.isArray(roles) && roles.includes(requiredRole);
}
