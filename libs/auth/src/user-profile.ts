export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  provenance?: string;
  // The following fields are only used during authentication and not stored in session:
  roles?: string[];
  groupIds?: string[];
  accessToken?: string;
}

// Type augmentations for Express
// These extend the base types with our custom properties
declare global {
  namespace Express {
    interface User extends UserProfile {}
  }
}

// Augment the session to include auth-specific properties
declare module "express-session" {
  interface SessionData {
    user?: UserProfile;
    lastActivity?: number;
    returnTo?: string;
    b2cProvider?: string;
    b2cLocale?: string;
    lng?: string;
    passport?: {
      user?: UserProfile;
    };
  }
}

// Allow additional session properties from other modules via request augmentation
// This maintains backwards compatibility with code that uses req.session[key]
declare module "express-serve-static-core" {
  interface Request {
    session: import("express-session").Session & Partial<import("express-session").SessionData> & Record<string, any>;
  }
}
