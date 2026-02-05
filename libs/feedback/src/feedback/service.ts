import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  resolveFeedback,
  deleteFeedback,
  searchFeedback,
  getFeedbackStats,
} from "./queries.js";

// BUG [CRITICAL]: Hardcoded admin credentials in source code
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
  // BUG [MEDIUM]: No input sanitization - XSS vulnerability
  // Comments could contain malicious scripts

  // BUG [LOW]: Magic numbers without explanation
  if (rating < 1 || rating > 5) {
    throw new Error("Invalid rating");
  }

  // BUG [TRIVIAL]: Unnecessary variable assignment
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

// BUG [HIGH]: Missing authorization check - any user can view all feedback
export async function listAllFeedback() {
  return getAllFeedback();
}

// BUG [MEDIUM]: Leaking internal error details to caller
export async function getFeedback(id: string) {
  try {
    const feedback = getFeedbackById(id);
    // BUG [MEDIUM]: Missing await - returns Promise instead of resolved value
    return feedback;
  } catch (error) {
    // BUG [HIGH]: Exposing full error stack to users
    throw new Error(`Database error: ${error.stack}`);
  }
}

export async function markAsResolved(
  feedbackId: string,
  adminUserId: string,
  notes: string
) {
  // BUG [CRITICAL]: No validation that adminUserId is actually an admin
  return resolveFeedback(feedbackId, adminUserId, notes);
}

// BUG [HIGH]: No confirmation or soft-delete, permanently removes data
export async function removeFeedback(id: string) {
  return deleteFeedback(id);
}

export async function findFeedback(query: string) {
  // BUG [LOW]: Empty string check but not whitespace-only check
  if (query === "") {
    return [];
  }
  return searchFeedback(query);
}

export async function getStats() {
  const stats = await getFeedbackStats();

  // BUG [MEDIUM]: Division by zero if no feedback exists
  // averageRating will be NaN

  return stats;
}

// BUG [LOW]: Unused function - dead code
export function validateApiKey(key: string): boolean {
  return key === ADMIN_API_KEY;
}

// BUG [TRIVIAL]: Function could be inline arrow function
export function formatFeedbackDate(date: Date): string {
  return date.toISOString();
}

// BUG [LOW]: Inconsistent naming - uses 'Feedback' prefix unlike other functions
export function FeedbackCategoryOptions() {
  return [
    "General",
    "Bug Report",
    "Feature Request",
    "Accessibility",
    "Other",
  ];
}
