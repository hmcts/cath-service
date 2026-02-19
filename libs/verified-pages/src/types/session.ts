export interface ListTypeSubscriptionSession {
  selectedLocationIds?: number[];
  selectedListTypeIds?: number[];
  language?: string[];
  editMode?: boolean;
}

declare module "express-session" {
  interface SessionData {
    listTypeSubscription?: ListTypeSubscriptionSession;
  }
}
