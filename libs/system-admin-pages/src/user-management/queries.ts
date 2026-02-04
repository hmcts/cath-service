import { prisma } from "@hmcts/postgres";
import type { Prisma } from "@prisma/client";

interface UserSearchFilters {
  email?: string;
  userId?: string;
  userProvenanceId?: string;
  roles?: string[];
  provenances?: string[];
}

interface UserSearchResult {
  users: User[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface User {
  userId: string;
  email: string;
  firstName: string | null;
  surname: string | null;
  userProvenance: string;
  userProvenanceId: string;
  role: string;
  createdDate: Date;
  lastSignedInDate: Date | null;
}

const PAGE_SIZE = 25;

export async function searchUsers(filters: UserSearchFilters, page: number = 1): Promise<UserSearchResult> {
  const skip = (page - 1) * PAGE_SIZE;

  const whereClause: Prisma.UserWhereInput = {};

  if (filters.email) {
    whereClause.email = { contains: filters.email, mode: "insensitive" };
  }

  if (filters.userId) {
    whereClause.userId = filters.userId;
  }

  if (filters.userProvenanceId) {
    whereClause.userProvenanceId = filters.userProvenanceId;
  }

  if (filters.roles && filters.roles.length > 0) {
    whereClause.role = { in: filters.roles };
  }

  if (filters.provenances && filters.provenances.length > 0) {
    whereClause.userProvenance = { in: filters.provenances };
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        userId: true,
        email: true,
        firstName: true,
        surname: true,
        userProvenance: true,
        userProvenanceId: true,
        role: true,
        createdDate: true,
        lastSignedInDate: true
      },
      skip,
      take: PAGE_SIZE,
      orderBy: { createdDate: "desc" }
    }),
    prisma.user.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    users,
    totalCount,
    currentPage: page,
    totalPages
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      firstName: true,
      surname: true,
      userProvenance: true,
      userProvenanceId: true,
      role: true,
      createdDate: true,
      lastSignedInDate: true
    }
  });
}

export async function deleteUserById(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // First, get all subscription IDs for this user
    const userSubscriptions = await tx.subscription.findMany({
      where: { userId },
      select: { id: true }
    });

    const subscriptionIds = userSubscriptions.map((sub) => sub.id);

    // Delete notification audit logs for these subscriptions
    if (subscriptionIds.length > 0) {
      await tx.notificationAuditLog.deleteMany({
        where: {
          subscriptionId: { in: subscriptionIds }
        }
      });
    }

    // Delete user subscriptions
    await tx.subscription.deleteMany({
      where: { userId }
    });

    // Delete the user
    await tx.user.delete({
      where: { userId }
    });
  });
}
