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

// Augment the session to include custom properties
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
    // Allow additional properties from various modules
    [key: string]: unknown;
  }
}
