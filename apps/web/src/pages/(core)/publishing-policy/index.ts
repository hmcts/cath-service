import { publishingPolicyCy, publishingPolicyEn } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? publishingPolicyCy : publishingPolicyEn;
  res.render("publishing-policy/index", {
    en: publishingPolicyEn,
    cy: publishingPolicyCy,
    pageTitle: t.title
  });
};
