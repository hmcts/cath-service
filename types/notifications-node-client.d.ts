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
    getNotificationById(
      notificationId: string
    ): Promise<{
      id: string;
      status: string;
      type: string;
      email_address?: string;
      phone_number?: string;
      body: string;
      created_at: string;
      sent_at?: string;
      template: {
        id: string;
        version: number;
        uri: string;
      };
      [key: string]: any;
    }>;
  }

  export default {
    NotifyClient
  };
}
