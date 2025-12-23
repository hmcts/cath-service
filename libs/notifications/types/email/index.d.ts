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
    body: NotificationBody;
  }

  export interface NotificationResponse {
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
  }

  export interface EmailOptions {
    personalisation?: Record<string, any>;
    reference?: string;
    emailReplyToId?: string;
  }

  export class NotifyClient {
    constructor(apiKey: string);
    sendEmail(templateId: string, emailAddress: string, options?: EmailOptions): Promise<EmailResponse>;
    getNotificationById(notificationId: string): Promise<NotificationResponse>;
  }
}
