import { prisma } from "@hmcts/postgres";

export interface SubscriptionWithUser {
  subscriptionId: string;
  userId: string;
  searchType: string;
  searchValue: string;
  caseName: string | null;
  caseNumber: string | null;
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
    select: {
      subscriptionId: true,
      userId: true,
      searchType: true,
      searchValue: true,
      caseName: true,
      caseNumber: true,
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

export async function findActiveSubscriptionsByCaseNumbers(caseNumbers: string[]): Promise<SubscriptionWithUser[]> {
  if (caseNumbers.length === 0) {
    return [];
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      searchType: "CASE_NUMBER",
      searchValue: {
        in: caseNumbers
      }
    },
    select: {
      subscriptionId: true,
      userId: true,
      searchType: true,
      searchValue: true,
      caseName: true,
      caseNumber: true,
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

export async function findActiveSubscriptionsByCaseNames(caseNames: string[]): Promise<SubscriptionWithUser[]> {
  if (caseNames.length === 0) {
    return [];
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      searchType: "CASE_NAME",
      searchValue: {
        in: caseNames
      }
    },
    select: {
      subscriptionId: true,
      userId: true,
      searchType: true,
      searchValue: true,
      caseName: true,
      caseNumber: true,
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
