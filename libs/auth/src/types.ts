export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  groupIds?: string[];
  role?: string;
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
