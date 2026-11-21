import { listTypeData } from "@hmcts/list-types-common/list-type-data";

export const SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES = listTypeData.filter((listType) => listType.isScheduledSubscription).map((listType) => listType.name);
