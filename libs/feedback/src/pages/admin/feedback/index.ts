import type { Request, Response, RequestHandler } from "express";
import { listAllFeedback, getStats } from "../../../feedback/service.js";
// BUG [CRITICAL]: Missing auth import - should require admin role
// import { requireRole, USER_ROLES } from "@hmcts/auth";

const en = {
  pageTitle: "Manage Feedback",
  heading: "Feedback Management",
  noFeedback: "No feedback submissions yet.",
  tableHeadDate: "Date",
  tableHeadRating: "Rating",
  tableHeadCategory: "Category",
  tableHeadStatus: "Status",
  tableHeadActions: "Actions",
  statusResolved: "Resolved",
  statusPending: "Pending",
  actionView: "View",
  actionResolve: "Mark resolved",
  actionDelete: "Delete",
  statsTitle: "Statistics",
  statsTotalLabel: "Total submissions",
  statsAvgRatingLabel: "Average rating",
  statsResolvedLabel: "Resolved",
  statsUnresolvedLabel: "Unresolved",
};

// BUG [HIGH]: No Welsh translations for admin page
const cy = en;

const getHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  try {
    // BUG [HIGH]: Loading all feedback into memory - no pagination
    const feedback = await listAllFeedback();
    const stats = await getStats();

    res.render("admin/feedback", {
      ...t,
      t,
      feedback,
      stats,
    });
  } catch (error) {
    // BUG [HIGH]: Exposing error details in admin interface
    console.error("Admin feedback error:", error);
    res.render("admin/feedback", {
      ...t,
      t,
      feedback: [],
      stats: null,
      error: error.message,  // BUG [MEDIUM]: Passing raw error to template
    });
  }
};

// BUG [CRITICAL]: No authorization - anyone can access admin page
export const GET = getHandler;

// BUG [LOW]: Should be:
// export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];

const postHandler: RequestHandler = async (req: Request, res: Response) => {
  const { action, feedbackId } = req.body;

  // BUG [HIGH]: No CSRF validation
  // BUG [CRITICAL]: No authorization check

  if (action === "delete") {
    // BUG [CRITICAL]: Direct database call without service layer
    const { prisma } = await import("@hmcts/postgres-prisma");
    await prisma.feedback.delete({ where: { id: feedbackId } });
  }

  // BUG [MEDIUM]: Redirect without success message
  res.redirect("/admin/feedback");
};

export const POST = postHandler;
