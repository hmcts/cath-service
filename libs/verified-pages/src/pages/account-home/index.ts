import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const navigationEn = {
  items: [
    {
      text: "Dashboard",
      href: "/account-home",
      current: true,
      attributes: {
        "data-test": "dashboard-link"
      }
    },
    {
      text: "Email subscriptions",
      href: "/",
      current: false,
      attributes: {
        "data-test": "email-subscriptions-link"
      }
    }
  ],
  signOut: "Sign out"
};

const navigationCy = {
  items: [
    {
      text: "Dangosfwrdd",
      href: "/account-home",
      current: true,
      attributes: {
        "data-test": "dashboard-link"
      }
    },
    {
      text: "Tanysgrifiadau e-bost",
      href: "/",
      current: false,
      attributes: {
        "data-test": "email-subscriptions-link"
      }
    }
  ],
  signOut: "Allgofnodi"
};

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const navigation = locale === "cy" ? navigationCy : navigationEn;

  res.render("account-home/index", {
    en,
    cy,
    navigation
  });
};
