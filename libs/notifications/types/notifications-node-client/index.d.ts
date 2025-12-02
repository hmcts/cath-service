declare module "notifications-node-client" {
  export interface NotificationBody {
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
  }

  export interface EmailResponse {
    data?: NotificationBody;
    body?: NotificationBody;
    id?: string;
  }

  export interface EmailOptions {
    personalisation?: Record<string, string>;
    reference?: string;
    emailReplyToId?: string;
  }

  export class NotifyClient {
    constructor(apiKey: string);
    sendEmail(templateId: string, emailAddress: string, options?: EmailOptions): Promise<EmailResponse>;
    getNotificationById(notificationId: string): Promise<EmailResponse>;
  }
}
