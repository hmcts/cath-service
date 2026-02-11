export interface ListTypeSubscriptionSession {
  selectedLocationIds?: number[];
  selectedListTypeIds?: number[];
  language?: string[];
}

declare module "express-session" {
  interface SessionData {
    listTypeSubscription?: ListTypeSubscriptionSession;
    listTypeSubscriptionConfirmed?: boolean;
  }
}
