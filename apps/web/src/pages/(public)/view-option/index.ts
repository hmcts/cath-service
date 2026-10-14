import { isFeatureEnabled } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LD_FLAG_WATCHDOG_INTEGRATION_TEST = "watchdog-integration-test";

const CASE_SEARCH_DESTINATIONS: Record<string, { path: string }> = {
  "case-name-search": { path: "/search?type=case" }
};

interface ViewOptionError {
  text: string;
  href: string;
}

export const GET = async (_req: Request, res: Response) => {
  res.render("view-option/index", {
    en,
    cy,
    isCaseSearchEnabled: await isFeatureEnabled(LD_FLAG_WATCHDOG_INTEGRATION_TEST, "anonymous")
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

  if (selectedOption === "case-search" && (await isFeatureEnabled(LD_FLAG_WATCHDOG_INTEGRATION_TEST, "anonymous"))) {
    return res.redirect(CASE_SEARCH_DESTINATIONS[selectedOption].path);
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
