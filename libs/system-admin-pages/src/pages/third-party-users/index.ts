import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findAllThirdPartyUsers } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";

  const users = await findAllThirdPartyUsers();

  res.render("third-party-users/index", {
    ...t,
    en,
    cy,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt.toLocaleDateString("en-GB")
    })),
    lngParam
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
