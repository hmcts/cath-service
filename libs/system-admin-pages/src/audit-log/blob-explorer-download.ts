import type {} from "@hmcts/auth";
import { AuditLogAction, logAction } from "./logger.js";

// Stored in the same normalised form auditLogMiddleware uses (e.g. BLOB_EXPLORER_RESUBMISSION),
// so both Blob Explorer actions look the same in the audit log list.
const BLOB_EXPLORER_DOWNLOAD_ACTION = AuditLogAction.BLOB_EXPLORER_DOWNLOAD.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

const FILE_TYPE_LABELS: Record<BlobExplorerDownloadFileType, string> = {
  pdf: "PDF",
  xlsx: "Excel"
};

export async function recordBlobExplorerDownload(user: Express.User | undefined, artefactId: string, fileType: BlobExplorerDownloadFileType): Promise<void> {
  await logAction({
    userId: user?.id || "unknown",
    userEmail: user?.email || "unknown",
    userRole: user?.role || "SYSTEM_ADMIN",
    userProvenance: user?.provenance || "azure-ad",
    action: BLOB_EXPLORER_DOWNLOAD_ACTION,
    details: `Artefact ID: ${artefactId}; File: ${FILE_TYPE_LABELS[fileType]}; Status: Completed successfully`
  });
}

export type BlobExplorerDownloadFileType = "pdf" | "xlsx";
