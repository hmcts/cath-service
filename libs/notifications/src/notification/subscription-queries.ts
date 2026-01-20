import { prisma } from "@hmcts/postgres";

export interface SubscriptionWithUser {
  subscriptionId: string;
  userId: string;
  locationId: number | null;
  searchType: string | null;
  searchValue: string | null;
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
