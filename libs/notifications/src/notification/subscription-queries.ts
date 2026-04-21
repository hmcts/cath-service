import { prisma } from "@hmcts/postgres";

export interface SubscriptionWithUser {
  subscriptionId: string;
  userId: string;
  searchType: string;
  searchValue: string;
  user: {
    email: string;
    firstName: string | null;
    surname: string | null;
  };
}

export interface ListTypeSubscriberWithUser {
  userId: string;
  user: {
    email: string;
    firstName: string | null;
    surname: string | null;
  };
}

export async function findActiveSubscriptionsByLocation(locationId: number): Promise<SubscriptionWithUser[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      searchType: "LOCATION_ID",
      searchValue: locationId.toString()
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          surname: true
        }
      }
    }
  });

  return subscriptions;
}

export async function findListTypeSubscribersByListTypeAndLanguage(listTypeId: number, language: string): Promise<ListTypeSubscriberWithUser[]> {
  return prisma.subscriptionListType.findMany({
    where: {
      listTypeIds: { has: listTypeId },
      listLanguage: { has: language }
    },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          firstName: true,
          surname: true
        }
      }
    }
  });
}
