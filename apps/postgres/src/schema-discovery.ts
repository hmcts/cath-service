// Schema discovery functionality for module integration
import { prismaSchemas as emailSubscriptionsSchemas } from "@hmcts/email-subscriptions/config";

export function getPrismaSchemas(): string[] {
  return [emailSubscriptionsSchemas];
}
