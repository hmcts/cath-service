import type { Request, Response, RequestHandler } from "express";
import { en } from "./en.js";
import { cy } from "./cy.js";
import { validateFeedbackForm } from "../../feedback/validation.js";
import { submitFeedback } from "../../feedback/service.js";

import { FeedbackCategoryOptions } from "../../feedback/service.js";

const getHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

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
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";

    const userAgent = req.headers["user-agent"] || "unknown";
    const pageUrl = req.headers.referer || req.originalUrl;

    await submitFeedback(
      parseInt(rating),
      category,
      comments,
      pageUrl,
      userAgent,
      ipAddress,
      req.user?.id,
      email
    );

    res.redirect("/feedback/success?submitted=true");
  } catch (error) {
    console.log("Feedback submission failed:", error, req.body);

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

export const GET = getHandler;
export const POST = postHandler;

interface FeedbackFormData {
  rating: string;
  category: string;
  comments: string;
  email?: string;
}
