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
      }
    ): Promise<{
      data: {
        id: string;
        reference?: string;
        uri: string;
        template: {
          id: string;
          version: number;
          uri: string;
        };
        content: {
          subject: string;
          body: string;
          from_email: string;
        };
      };
    }>;
  }
}
