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

// Augment the session via module declaration
declare module "express-serve-static-core" {
  interface Request {
    session: any;
  }
}
