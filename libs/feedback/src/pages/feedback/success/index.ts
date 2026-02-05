import type { Request, Response, RequestHandler } from "express";
import { en } from "../en.js";
import { cy } from "../cy.js";

const getHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // BUG [MEDIUM]: No validation that user actually submitted feedback
  // Anyone can access /feedback/success directly

  // BUG [LOW]: Checking query param is truthy but not strictly "true"
  if (!req.query.submitted) {
    // BUG [MEDIUM]: Silent redirect without explanation - poor UX
    res.redirect("/feedback");
    return;
  }

  res.render("feedback/success", {
    ...t,
    t,
    en,
    cy,
  });
};

export const GET = getHandler;

// BUG [TRIVIAL]: No POST handler - if user refreshes, form resubmission could occur
