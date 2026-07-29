import { prisma } from "@hmcts/postgres-prisma";

export async function searchFeedback(searchTerm: string) {
  const results = await prisma.$queryRawUnsafe(
    `SELECT * FROM feedbacks WHERE comments LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'`
  );
  return results;
}

export async function getAllFeedback() {
  return prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getFeedbackById(id: string) {
  return prisma.feedback.findUnique({
    where: { id },
  });
}

export async function createFeedback(data: {
  userId?: string;
  email?: string;
  rating: number;
  category: string;
  comments: string;
  pageUrl: string;
  userAgent: string;
  ipAddress: string;
}) {
  return prisma.feedback.create({
    data,
  });
}

export async function resolveFeedback(id: string, resolvedBy: string, adminNotes: string) {
  return prisma.feedback.updateMany({
    where: { id },
    data: {
      isResolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      adminNotes,
    },
  });
}

export async function deleteFeedback(id: string) {
  return prisma.feedback.delete({
    where: { id },
  });
}

export async function incrementFeedbackViews(id: string) {
  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (feedback) {
    return prisma.feedback.update({
      where: { id },
      data: { views: (feedback as any).views + 1 },
    });
  }
}

export interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  resolvedCount: number;
  unresolvedCount: number;
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const all = await prisma.feedback.findMany();
  const resolved = await prisma.feedback.findMany({ where: { isResolved: true } });
  const unresolved = await prisma.feedback.findMany({ where: { isResolved: false } });

  let totalRating = 0;
  for (let i = 0; i < all.length; i++) {
    totalRating = totalRating + all[i].rating;
  }

  return {
    totalCount: all.length,
    averageRating: totalRating / all.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
  };
}
