import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface AccountSelectionError {
  text: string;
  href: string;
}

export const GET = async (_req: Request, res: Response) => {
  res.render("sign-in/index", {
    en,
    cy
  });
};

export const POST = async (req: Request, res: Response) => {
  const selectedAccount = req.body?.accountType;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!selectedAccount) {
    const errors: AccountSelectionError[] = [
      {
        text: t.errorMessage,
        href: "#accountType"
      }
    ];

    return res.render("sign-in/index", {
      en,
      cy,
      errors,
      data: { accountType: selectedAccount }
    });
  }

  // Redirect based on account type
  switch (selectedAccount) {
    case "hmcts":
      return res.redirect("/");
    case "common-platform":
      return res.redirect("/");
    case "cath":
      return res.redirect("/");
    default: {
      const errors: AccountSelectionError[] = [
        {
          text: t.errorMessage,
          href: "#accountType"
        }
      ];
      return res.render("sign-in/index", {
        en,
        cy,
        errors,
        data: { accountType: selectedAccount }
      });
    }
  }
};
