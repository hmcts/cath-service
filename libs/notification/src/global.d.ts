declare module "notifications-node-client" {
  export class NotifyClient {
    constructor(apiKey: string);
    sendEmail(
      templateId: string,
      emailAddress: string,
      options?: {
        personalisation?: Record<string, string>;
        reference?: string;
        emailReplyToId?: string;
        oneClickUnsubscribeURL?: string;
      }
    ): Promise<unknown>;
  }
}
