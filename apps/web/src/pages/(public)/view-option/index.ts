import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

// Matches pip-frontend: stops the browser restoring a stale copy (e.g. one showing an error) on Back.
const NO_STORE = "private, max-age=0, no-cache, no-store, must-revalidate";

interface ViewOptionError {
  text: string;
  href: string;
}

export const GET = async (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", NO_STORE);
  res.render("view-option/index", {
    en,
    cy
  });
};

export const POST = async (req: Request, res: Response) => {
  const selectedOption = req.body?.viewOption;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  res.setHeader("Cache-Control", NO_STORE);

  if (!selectedOption) {
    const errors: ViewOptionError[] = [
      {
        text: t.errorMessage,
        href: "#viewOption"
      }
    ];

    return res.render("view-option/index", {
      en,
      cy,
      errors
    });
  }

  if (selectedOption === "court-tribunal") {
    return res.redirect("/search");
  }

  if (selectedOption === "sjp-case") {
    return res.redirect("/summary-of-publications?locationId=9");
  }

  const errors: ViewOptionError[] = [
    {
      text: t.errorMessage,
      href: "#viewOption"
    }
  ];

  res.render("view-option/index", {
    en,
    cy,
    errors
  });
};
