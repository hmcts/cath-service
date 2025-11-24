declare module "express-session" {
  interface SessionData {
    emailSubscriptions?: {
      pendingSubscriptions?: string[];
      confirmationComplete?: boolean;
      confirmedLocations?: string[];
    };
    successMessage?: string;
  }
}

export {};
