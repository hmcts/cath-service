declare module "notifications-node-client" {
  export interface PreparedUpload {
    file: string;
    filename: string | null;
    confirm_email_before_download: boolean | null;
    retention_period: string | null;
  }

  export class NotifyClient {
    constructor(apiKey: string);
    sendEmail(
      templateId: string,
      emailAddress: string,
      options?: {
        personalisation?: Record<string, string | PreparedUpload>;
        reference?: string;
        emailReplyToId?: string;
        oneClickUnsubscribeURL?: string;
      }
    ): Promise<unknown>;
    prepareUpload(
      fileData: Buffer,
      options?: {
        filename?: string;
        confirmEmailBeforeDownload?: boolean;
        retentionPeriod?: string;
      }
    ): PreparedUpload;
  }
}
