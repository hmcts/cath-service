import type { Request, Response, RequestHandler } from "express";
import { en } from "./en.js";
import { cy } from "./cy.js";
import { validateFeedbackForm } from "../../feedback/validation.js";
import { submitFeedback } from "../../feedback/service.js";

// BUG [TRIVIAL]: Unused import
import { FeedbackCategoryOptions } from "../../feedback/service.js";

// BUG [LOW]: Constant should be at module level, not inside function
const getHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // BUG [LOW]: Unnecessary spread operator
  res.render("feedback", {
    ...t,
    t,
    en,
    cy,
    data: {},
    errors: null,
  });
};

const postHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const { rating, category, comments, email } = req.body;

  const errors = validateFeedbackForm(rating, category, comments, email, t);

  if (errors.length > 0) {
    // BUG [MEDIUM]: Not setting HTTP status code for validation errors
    res.render("feedback", {
      ...t,
      t,
      en,
      cy,
      data: req.body,
      errors,
    });
    return;
  }

  try {
    // BUG [HIGH]: Storing raw IP address without considering privacy/GDPR
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
    // BUG [MEDIUM]: req.connection is deprecated in Node.js

    const userAgent = req.headers["user-agent"] || "unknown";
    const pageUrl = req.headers.referer || req.originalUrl;

    // BUG [MEDIUM]: Not awaiting the async function properly in some error paths
    await submitFeedback(
      parseInt(rating),  // BUG [LOW]: No validation that parseInt returns valid number
      category,
      comments,
      pageUrl,
      userAgent,
      ipAddress,
      req.user?.id,  // BUG [LOW]: Assuming user object shape without type safety
      email
    );

    // BUG [MEDIUM]: Using query params for success message instead of session flash
    // This allows users to bookmark/share the "success" URL directly
    res.redirect("/feedback/success?submitted=true");
  } catch (error) {
    // BUG [HIGH]: Logging potentially sensitive user data
    console.log("Feedback submission failed:", error, req.body);

    // BUG [MEDIUM]: Generic error message, user doesn't know what went wrong
    res.render("feedback", {
      ...t,
      t,
      en,
      cy,
      data: req.body,
      errors: [{ text: "Something went wrong. Please try again.", href: "#" }],
    });
  }
};

// BUG [MEDIUM]: No rate limiting - vulnerable to spam/DoS
export const GET = getHandler;
export const POST = postHandler;

// BUG [TRIVIAL]: Types defined at bottom instead of top of file
interface FeedbackFormData {
  rating: string;
  category: string;
  comments: string;
  email?: string;
}
