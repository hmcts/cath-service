import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findAllThirdPartyUsers } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

type Language = "en" | "cy";

export const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";

  const users = await findAllThirdPartyUsers();

  res.render("third-party-users/index", {
    ...t,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt.toLocaleDateString("en-GB")
    })),
    lngParam
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
