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
    };
    pendingSubscriptionsRestored?: boolean;
  }
}

export {};
