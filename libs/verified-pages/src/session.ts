declare module "express-session" {
  interface SessionData {
    emailSubscriptions: {
      pendingSubscriptions?: string[];
      pendingListTypeIds?: number[];
      pendingLanguage?: string;
      confirmationComplete?: boolean;
      confirmedLocations?: string[];
      subscriptionToRemove?: string;
      caseNameSearch?: string;
      caseReferenceSearch?: string;
      caseSearchResults?: Array<{ caseNumber: string | null; caseName: string | null }>;
      searchSource?: "/case-name-search" | "/case-reference-search";
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
    };
    pendingSubscriptionsRestored?: boolean;
  }
}

export {};
