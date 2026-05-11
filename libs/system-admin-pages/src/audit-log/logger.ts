import { prisma } from "@hmcts/postgres-prisma";

export enum AuditLogAction {
  ADD_JURISDICTION = "Add jurisdiction",
  ADD_REGION = "Add region",
  ADD_SUB_JURISDICTION = "Add sub-jurisdiction",
  BLOB_EXPLORER_RESUBMISSION = "Blob explorer resubmission",
  CREATE_THIRD_PARTY_USER = "Create third party user",
  DELETE_COURT = "Delete court",
  DELETE_THIRD_PARTY_USER = "Delete third party user",
  DELETE_USER = "Delete user",
  MANUAL_UPLOAD = "Manual upload",
  NON_STRATEGIC_UPLOAD = "Non strategic upload",
  REFERENCE_DATA_UPLOAD = "Reference data upload",
  REMOVE_LIST = "Remove list",
  UPDATE_THIRD_PARTY_SUBSCRIPTIONS = "Update third party subscriptions"
}

export interface AuditLogData {
  userId: string;
  userEmail: string;
  userRole: string;
  userProvenance: string;
  action: string;
  details?: string;
}

export async function logAction(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        userRole: data.userRole,
        userProvenance: data.userProvenance,
        action: data.action,
        details: data.details
      }
    });
  } catch (error) {
    console.error("Failed to create audit log entry:", error);
    throw error;
  }
}
