import { prisma } from "@hmcts/postgres";

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
