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

    sendSms(
      templateId: string,
      phoneNumber: string,
      options?: {
        personalisation?: Record<string, string>;
        reference?: string;
        smsSenderId?: string;
      }
    ): Promise<unknown>;

    sendLetter(
      templateId: string,
      options?: {
        personalisation?: Record<string, string>;
        reference?: string;
      }
    ): Promise<unknown>;
  }
}
