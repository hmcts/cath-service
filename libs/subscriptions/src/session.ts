declare module "express-session" {
  interface SessionData {
    emailSubscriptions?: {
      pendingSubscriptions?: string[];
      pendingCaseSubscriptions?: Array<{
        caseName: string;
        caseNumber: string | null;
        searchType: "CASE_NAME" | "CASE_NUMBER";
        searchValue: string;
      }>;
      confirmedCaseSubscriptions?: Array<{
        caseName: string;
        caseNumber: string | null;
        searchType: "CASE_NAME" | "CASE_NUMBER";
        searchValue: string;
      }>;
      pendingListTypeIds?: number[];
      pendingLanguage?: string;
      confirmationComplete?: boolean;
      listUpdateComplete?: boolean;
      confirmedLocations?: string[];
      subscriptionToRemove?: string;
      caseNameSearch?: string;
      caseReferenceSearch?: string;
      caseSearchResults?: Array<{ caseNumber: string | null; caseName: string | null }>;
      searchSource?: "/case-name-search" | "/case-reference-search";
    };
    pendingSubscriptionsRestored?: boolean;
  }
}

export {};
