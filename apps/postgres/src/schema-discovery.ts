// Schema discovery functionality for module integration

import { prismaSchemas as locationSchemas } from "@hmcts/location/config";
import { prismaSchemas as notificationsSchemas } from "@hmcts/notifications/config";
import { prismaSchemas as subscriptionsSchemas } from "@hmcts/subscriptions/config";

export function getPrismaSchemas(): string[] {
  return [subscriptionsSchemas, locationSchemas, notificationsSchemas];
}
