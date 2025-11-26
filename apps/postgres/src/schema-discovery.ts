// Schema discovery functionality for module integration
import { prismaSchemas as emailSubscriptionsSchemas } from "@hmcts/email-subscriptions/config";
import { prismaSchemas as locationSchemas } from "@hmcts/location/config";

export function getPrismaSchemas(): string[] {
  return [emailSubscriptionsSchemas, locationSchemas];
}
