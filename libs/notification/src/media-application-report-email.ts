import { extractNotifyError, GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT, prepareNotifyFileUpload, sendNotifyEmail } from "@hmcts/govuk-notify";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const RETENTION_PERIOD = "78 weeks";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENV_DISPLAY_NAMES: Record<string, string> = {
  prod: "Production",
  aat: "AAT",
  demo: "Demo",
  perftest: "Perftest"
};

export async function sendMediaApplicationReportEmail({ csvBuffer, reportDate, applicationCount }: MediaApplicationReportEmailData): Promise<void> {
  const apiKey = getRequiredEnv("GOVUK_NOTIFY_API_KEY");
  const recipient = getRecipient();

  if (csvBuffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Media application report CSV exceeds the 2MB GOV.UK Notify limit");
  }

  const isoDate = reportDate.toISOString();

  try {
    const linkToFile = prepareNotifyFileUpload(apiKey, csvBuffer, {
      filename: `media-application-report-${isoDate.slice(0, 10)}.csv`,
      confirmEmailBeforeDownload: false,
      retentionPeriod: RETENTION_PERIOD
    });

    await sendNotifyEmail({
      apiKey,
      templateId: GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT,
      emailAddress: recipient,
      personalisation: {
        link_to_file: linkToFile,
        env_name: getEnvDisplayName()
      },
      reference: `media-application-report-${reportDate.getTime()}`
    });
  } catch (error) {
    const { message } = extractNotifyError(error);
    throw new Error(`GOV.UK Notify error: ${message}`);
  }

  console.log(`[media-reporting] Report email for ${applicationCount} applications sent via GOV.UK Notify (${isoDate}).`);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

function getRecipient(): string {
  const recipient = getRequiredEnv("MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL");
  if (!EMAIL_PATTERN.test(recipient)) {
    throw new Error("MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL is not a valid email address");
  }
  return recipient;
}

function getEnvDisplayName(): string {
  const envName = process.env.ENV_NAME;
  if (!envName) {
    return "Local";
  }
  return ENV_DISPLAY_NAMES[envName] ?? envName;
}

interface MediaApplicationReportEmailData {
  csvBuffer: Buffer;
  reportDate: Date;
  applicationCount: number;
}
