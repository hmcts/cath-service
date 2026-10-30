import { sendMediaApplicationReportEmail } from "@hmcts/notification";
import { deleteApplicationsByIds, getApplicationsForReport } from "./queries.js";
import { buildMediaApplicationReportCsv } from "./report-csv.js";

const LOG_PREFIX = "[media-reporting]";
const PROCESSED_STATUSES = new Set(["APPROVED", "REJECTED"]);

export async function runMediaApplicationReport(now = new Date()): Promise<void> {
  const applications = await getApplicationsForReport().catch((error: unknown) => {
    throw new Error(`Failed to retrieve media applications: ${errorMessage(error)}`);
  });

  if (applications.length === 0) {
    console.log(`${LOG_PREFIX} No media applications found. Skipping report.`);
    return;
  }

  const csvBuffer = Buffer.from(buildMediaApplicationReportCsv(applications), "utf8");

  try {
    await sendMediaApplicationReportEmail({ csvBuffer, reportDate: now, applicationCount: applications.length });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to send report email: ${errorMessage(error)}`);
    throw error;
  }

  console.log(`${LOG_PREFIX} Report email sent for ${applications.length} applications.`);

  // Pending applications are reported but kept, so admins can still review them.
  const ids = applications.filter((application) => PROCESSED_STATUSES.has(application.status)).map((application) => application.id);

  if (ids.length === 0) {
    console.log(`${LOG_PREFIX} No processed media applications to delete.`);
    return;
  }

  const deletedCount = await deleteApplicationsByIds(ids).catch((error: unknown) => {
    throw new Error(`Failed to delete processed applications: ${errorMessage(error)}`);
  });

  if (deletedCount !== ids.length) {
    console.warn(`${LOG_PREFIX} Deleted ${deletedCount} of ${ids.length} reported applications; some may have been removed concurrently.`);
  }

  console.log(`${LOG_PREFIX} Deleted ${deletedCount} processed media applications.`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
