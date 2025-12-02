declare module "notifications-node-client" {
  export class NotifyClient {
    constructor(apiKey: string);
    sendEmail(templateId: string, emailAddress: string, options?: { personalisation?: Record<string, string> }): Promise<any>;
    getNotificationById(notificationId: string): Promise<any>;
  }
}
