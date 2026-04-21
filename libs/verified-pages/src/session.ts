declare module "express-session" {
  interface SessionData {
    emailSubscriptions: {
      pendingSubscriptions?: string[];
      pendingListTypeIds?: number[];
      pendingLanguage?: string;
      confirmationComplete?: boolean;
      confirmedLocations?: string[];
      subscriptionToRemove?: string;
    };
    pendingSubscriptionsRestored?: boolean;
  }
}

export {};
