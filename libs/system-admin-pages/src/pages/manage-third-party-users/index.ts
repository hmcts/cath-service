import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findAllThirdPartyUsers, getHighestSensitivity } from "../../third-party-user/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (_req: Request, res: Response) => {
  const users = await findAllThirdPartyUsers();

  const usersWithSensitivity = users.map((user) => ({
    ...user,
    highestSensitivity: getHighestSensitivity(user.subscriptions)
  }));

  res.render("manage-third-party-users/index", {
    en,
    cy,
    users: usersWithSensitivity
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
