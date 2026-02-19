import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { validateThirdPartyUserName } from "../../third-party-user/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface CreateThirdPartyUserSession {
  createThirdPartyUser?: {
    name: string;
    idempotencyToken: string;
    createdUserId?: string;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as CreateThirdPartyUserSession;

  const savedName = session.createThirdPartyUser?.name || "";

  res.render("create-third-party-user/index", {
    ...content,
    errors: undefined,
    name: savedName
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const name = req.body.name as string | undefined;

  const validationError = validateThirdPartyUserName(name);
  if (validationError) {
    const errorText = !name || name.trim() === "" ? content.nameRequired : content.nameTooLong;
    return res.render("create-third-party-user/index", {
      ...content,
      errors: [{ ...validationError, text: errorText }],
      name: name || ""
    });
  }

  const session = req.session as CreateThirdPartyUserSession;
  const idempotencyToken = Math.random().toString(36).substring(7);

  session.createThirdPartyUser = {
    name: name!.trim(),
    idempotencyToken
  };

  res.redirect(`/create-third-party-user-summary${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
