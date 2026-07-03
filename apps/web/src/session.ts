import "express-session";
import type { UploadSessionData } from "@hmcts/system-admin-pages";

declare module "express-session" {
  interface SessionData {
    // Bulk unsubscribe (verified pages)
    bulkUnsubscribe?: {
      selectedIds?: string[];
    };

    // List removal (admin pages)
    removalData?: {
      locationId: string;
      locationName: string;
      selectedArtefacts: string[];
    };
    removalSuccess?: boolean;

    // Media application rejection (admin pages)
    rejectionReasons?: {
      notAccredited?: string;
      invalidId?: string;
      detailsMismatch?: string;
      selectedReasons?: string[];
    };

    // Reference data upload (system-admin pages)
    uploadData?: UploadSessionData;
    uploadErrors?: Array<{ text: string; href?: string }>;

    // Location/jurisdiction management (system-admin pages)
    jurisdictionSuccess?: { name: string; welshName: string };
    regionSuccess?: { name: string; welshName: string };
    subJurisdictionSuccess?: boolean;
  }
}
