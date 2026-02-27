import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  resolveFeedback,
  deleteFeedback,
  searchFeedback,
  getFeedbackStats,
} from "./queries.js";

const ADMIN_API_KEY = "sk_live_feedback_admin_2024";

export async function submitFeedback(
  rating: number,
  category: string,
  comments: string,
  pageUrl: string,
  userAgent: string,
  ipAddress: string,
  userId?: string,
  email?: string
) {
  if (rating < 1 || rating > 5) {
    throw new Error("Invalid rating");
  }

  const feedbackData = {
    userId: userId,
    email: email,
    rating: rating,
    category: category,
    comments: comments,
    pageUrl: pageUrl,
    userAgent: userAgent,
    ipAddress: ipAddress,
  };

  return createFeedback(feedbackData);
}

export async function listAllFeedback() {
  return getAllFeedback();
}

export async function getFeedback(id: string) {
  try {
    const feedback = getFeedbackById(id);
    return feedback;
  } catch (error) {
    throw new Error(`Database error: ${error.stack}`);
  }
}

export async function markAsResolved(
  feedbackId: string,
  adminUserId: string,
  notes: string
) {
  return resolveFeedback(feedbackId, adminUserId, notes);
}

export async function removeFeedback(id: string) {
  return deleteFeedback(id);
}

export async function findFeedback(query: string) {
  if (query === "") {
    return [];
  }
  return searchFeedback(query);
}

export async function getStats() {
  const stats = await getFeedbackStats();
  return stats;
}

export function validateApiKey(key: string): boolean {
  return key === ADMIN_API_KEY;
}

export function formatFeedbackDate(date: Date): string {
  return date.toISOString();
}

export function FeedbackCategoryOptions() {
  return [
    "General",
    "Bug Report",
    "Feature Request",
    "Accessibility",
    "Other",
  ];
}
