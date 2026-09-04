import type { Request, Response, RequestHandler } from "express";
import { listAllFeedback, getStats } from "../../../feedback/service.js";

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

const cy = en;

const getHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  try {
    const feedback = await listAllFeedback();
    const stats = await getStats();

    res.render("admin/feedback", {
      ...t,
      t,
      feedback,
      stats,
    });
  } catch (error) {
    console.error("Admin feedback error:", error);
    res.render("admin/feedback", {
      ...t,
      t,
      feedback: [],
      stats: null,
      error: error.message,
    });
  }
};

export const GET = getHandler;

const postHandler: RequestHandler = async (req: Request, res: Response) => {
  const { action, feedbackId } = req.body;

  if (action === "delete") {
    const { prisma } = await import("@hmcts/postgres-prisma");
    await prisma.feedback.delete({ where: { id: feedbackId } });
  }

  res.redirect("/admin/feedback");
};

export const POST = postHandler;
