import { prisma } from "@hmcts/postgres-prisma";

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

export async function findActiveSubscriptionsByLocation(locationId: number): Promise<SubscriptionWithUser[]> {
  return prisma.subscription.findMany({
    where: {
      searchType: "LOCATION_ID",
      searchValue: locationId.toString()
    },
    select: {
      subscriptionId: true,
      userId: true,
      searchType: true,
      searchValue: true,
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
