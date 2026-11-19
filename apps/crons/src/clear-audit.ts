import { deleteExpiredAuditLogs } from "@hmcts/system-admin-pages/audit-log/repository";
import { closeConnections } from "./close-connections.js";

export default async function clearAudit() {
  try {
    const { cutoff, deleted } = await deleteExpiredAuditLogs();
    console.info(`[ClearAudit] Deleted ${deleted} audit log rows with timestamp before ${cutoff.toISOString()}`);
  } finally {
    await closeConnections();
  }
}
