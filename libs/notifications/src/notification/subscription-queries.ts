import { prisma } from "@hmcts/postgres";

export interface SubscriptionWithUser {
  subscriptionId: string;
  userId: string;
  locationId: number;
  user: {
    email: string;
    firstName: string | null;
    surname: string | null;
  };
}

export async function findActiveSubscriptionsByLocation(locationId: number): Promise<SubscriptionWithUser[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      locationId
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
