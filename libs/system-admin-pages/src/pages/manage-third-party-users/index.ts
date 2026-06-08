import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findAllThirdPartyUsers } from "../../third-party-user/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (_req: Request, res: Response) => {
  const users = await findAllThirdPartyUsers();

  res.render("manage-third-party-users/index", {
    en,
    cy,
    users
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
