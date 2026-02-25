// Schema discovery functionality for module integration
import { prismaSchemas as auditLogSchemas } from "@hmcts/audit-log/config";
import { prismaSchemas as listSearchConfigSchemas } from "@hmcts/list-search-config/config";
import { prismaSchemas as locationSchemas } from "@hmcts/location/config";
import { prismaSchemas as notificationsSchemas } from "@hmcts/notifications/config";
import { prismaSchemas as subscriptionListTypesSchemas } from "@hmcts/subscription-list-types/config";
import { prismaSchemas as subscriptionsSchemas } from "@hmcts/subscriptions/config";

export function getPrismaSchemas(): string[] {
  return [subscriptionsSchemas, subscriptionListTypesSchemas, locationSchemas, notificationsSchemas, listSearchConfigSchemas, auditLogSchemas];
}
