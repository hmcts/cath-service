// Schema discovery functionality for module integration
import { prismaSchemas as listSearchConfigSchemas } from "@hmcts/list-search-config/config";
import { prismaSchemas as locationSchemas } from "@hmcts/location/config";
import { prismaSchemas as notificationsSchemas } from "@hmcts/notifications/config";
import { prismaSchemas as subscriptionSchemas } from "@hmcts/subscription/config";
import { prismaSchemas as subscriptionListTypesSchemas } from "@hmcts/subscription-list-types/config";

export function getPrismaSchemas(): string[] {
  return [subscriptionSchemas, subscriptionListTypesSchemas, locationSchemas, notificationsSchemas, listSearchConfigSchemas];
}
