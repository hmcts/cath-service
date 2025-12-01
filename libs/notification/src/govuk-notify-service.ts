import { NotifyClient } from "notifications-node-client";

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY;
const TEMPLATE_ID_MEDIA_APPROVAL = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL;

interface MediaApplicationEmailData {
  name: string;
  email: string;
  employer: string;
}

export async function sendMediaApprovalEmail(data: MediaApplicationEmailData): Promise<void> {
  console.log("📧 [GOV Notify] Starting media approval email send process");
  console.log("📧 [GOV Notify] Recipient:", data.email);
  console.log("📧 [GOV Notify] Name:", data.name);
  console.log("📧 [GOV Notify] Employer:", data.employer);

  if (!GOVUK_NOTIFY_API_KEY) {
    console.error("❌ [GOV Notify] GOVUK_NOTIFY_API_KEY is not set in environment variables");
    throw new Error("GOV Notify API key not configured");
  }

  if (!TEMPLATE_ID_MEDIA_APPROVAL) {
    console.error("❌ [GOV Notify] GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL is not set in environment variables");
    throw new Error("GOV Notify approval template ID not configured");
  }

  console.log("✅ [GOV Notify] API key found:", GOVUK_NOTIFY_API_KEY.substring(0, 20) + "...");
  console.log("✅ [GOV Notify] Template ID:", TEMPLATE_ID_MEDIA_APPROVAL);

  try {
    const notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);
    console.log("✅ [GOV Notify] NotifyClient initialized");

    const personalisation = {
      "Full name": data.name,
      Employer: data.employer
    };

    console.log("📧 [GOV Notify] Sending email with personalisation:", JSON.stringify(personalisation, null, 2));

    const response = await notifyClient.sendEmail(TEMPLATE_ID_MEDIA_APPROVAL, data.email, {
      personalisation,
      reference: `media-approval-${Date.now()}`
    });

    console.log("✅ [GOV Notify] Email sent successfully!");
    console.log("✅ [GOV Notify] Response ID:", response.data.id);
    console.log("✅ [GOV Notify] Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ [GOV Notify] Error sending approval email:");
    console.error("❌ [GOV Notify] Error details:", error);

    if (error instanceof Error) {
      console.error("❌ [GOV Notify] Error message:", error.message);
      console.error("❌ [GOV Notify] Error stack:", error.stack);
    }

    if (typeof error === "object" && error !== null && "response" in error) {
      const responseError = error as { response?: { data?: unknown; status?: number } };
      console.error("❌ [GOV Notify] Response status:", responseError.response?.status);
      console.error("❌ [GOV Notify] Response data:", JSON.stringify(responseError.response?.data, null, 2));
    }

    throw error;
  }
}
