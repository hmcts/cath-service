export const APPLICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export interface MediaApplicationDetails {
  id: string;
  name: string;
  email: string;
  employer: string;
  proofOfIdPath: string | null;
  status: ApplicationStatus;
  appliedDate: Date;
}

export interface PendingApplicationSummary {
  id: string;
  name: string;
  employer: string;
  appliedDate: Date;
}

declare module "express-session" {
  interface SessionData {
    mediaApplicationApproval?: {
      applicationId: string;
      confirmed: boolean;
    };
  }
}
