import "@hmcts/auth"; // Ensures Express.User augmentation (includes id) is in scope

declare module "express-session" {
  interface SessionData {
    emailSubscriptions?: {
      pendingSubscriptions?: string[];
    };
    pendingSubscriptionsRestored?: boolean;
  }
}
