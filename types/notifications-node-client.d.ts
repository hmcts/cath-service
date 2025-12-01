declare module "notifications-node-client" {
  export class NotifyClient {
    constructor(apiKey: string);
    sendEmail(
      templateId: string,
      emailAddress: string,
      options?: {
        personalisation?: Record<string, any>;
        reference?: string | null;
        emailReplyToId?: string;
        oneClickUnsubscribeURL?: string;
      }
    ): Promise<{
      body: {
        id: string;
        reference: string | null;
        uri: string;
        template: {
          id: string;
          version: number;
          uri: string;
        };
        content: {
          subject: string | null;
          body: string;
          from_email: string;
        };
      };
    }>;
  }

  export default {
    NotifyClient
  };
}
