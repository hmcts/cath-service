declare module "notifications-node-client" {
  export interface NotificationEmailOptions {
    personalisation?: Record<string, string | number | boolean>;
    reference?: string;
    emailReplyToId?: string;
    oneClickUnsubscribeURL?: string;
  }

  export interface NotificationResponse {
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
  }

  export class NotifyClient {
    constructor(apiKey: string, baseUrl?: string);

    sendEmail(
      templateId: string,
      emailAddress: string,
      options?: NotificationEmailOptions
    ): Promise<NotificationResponse>;
  }
}
