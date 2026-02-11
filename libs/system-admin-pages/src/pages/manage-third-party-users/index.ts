import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findAllThirdPartyUsers, getHighestSensitivity } from "../../third-party-user/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const users = await findAllThirdPartyUsers();

  const usersWithSensitivity = users.map((user) => ({
    ...user,
    highestSensitivity: getHighestSensitivity(user.subscriptions)
  }));

  res.render("manage-third-party-users/index", {
    ...content,
    users: usersWithSensitivity
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
