import type { Request, Response } from "express";
import { cy, en } from "../locales/view-option.js";

interface ViewOptionError {
  text: string;
  href: string;
}

export const GET = async (_req: Request, res: Response) => {
  res.render("view-option", {
    en,
    cy,
    backLink: "/"
  });
};

export const POST = async (req: Request, res: Response) => {
  const selectedOption = req.body?.viewOption;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!selectedOption) {
    const errors: ViewOptionError[] = [
      {
        text: t.errorMessage,
        href: "#viewOption"
      }
    ];

    return res.render("view-option", {
      en,
      cy,
      errors,
      backLink: "/"
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

  res.render("view-option", {
    en,
    cy,
    errors,
    backLink: "/"
  });
};
