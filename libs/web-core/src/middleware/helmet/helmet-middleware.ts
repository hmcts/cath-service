import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";

export interface SecurityOptions {
  enableGoogleTagManager?: boolean;
  isDevelopment?: boolean;
  cftIdamUrl?: string;
  b2cTenantName?: string;
  b2cCustomDomain?: string;
}

export function configureNonce() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  };
}

export function configureHelmet(options: SecurityOptions = {}) {
  const { enableGoogleTagManager = true, isDevelopment = process.env.NODE_ENV !== "production", cftIdamUrl, b2cTenantName, b2cCustomDomain } = options;

  // Use custom domain if provided, otherwise fall back to b2clogin.com
  const b2cUrl = b2cCustomDomain ? `https://${b2cCustomDomain}` : b2cTenantName ? `https://${b2cTenantName}.b2clogin.com` : undefined;

  const scriptSources = [
    "'self'",
    (_req: any, res: any) => `'nonce-${res.locals.cspNonce}'`,
    ...(enableGoogleTagManager ? ["https://*.googletagmanager.com"] : []),
    ...(isDevelopment ? ["ws://localhost:5173"] : [])
  ];

  const connectSources = [
    "'self'",
    ...(enableGoogleTagManager ? ["https://*.google-analytics.com", "https://*.googletagmanager.com"] : []),
    ...(isDevelopment ? ["ws://localhost:5173", "ws://localhost:24678"] : [])
  ];

  const imageSources = ["'self'", "data:", ...(enableGoogleTagManager ? ["https://*.google-analytics.com", "https://*.googletagmanager.com"] : [])];

  const frameSources = ["'self'", ...(enableGoogleTagManager ? ["https://*.googletagmanager.com"] : [])];

  const formActionSources = ["'self'", ...(cftIdamUrl ? [cftIdamUrl] : []), ...(b2cUrl ? [b2cUrl] : [])];

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: scriptSources,
        imgSrc: imageSources,
        fontSrc: ["'self'", "data:"],
        connectSrc: connectSources,
        formAction: formActionSources,
        objectSrc: ["'self'"],
        ...(frameSources.length > 0 && { frameSrc: frameSources })
      }
    }
  });
}
