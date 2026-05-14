import { requireRole, USER_ROLES } from "@hmcts/auth";
import { manageThirdPartyUsersCy as cy, manageThirdPartyUsersEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { findAllThirdPartyUsers, getHighestSensitivity } from "../../third-party-user/queries.js";

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
