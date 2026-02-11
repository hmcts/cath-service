import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { deleteThirdPartyUser, findThirdPartyUserById } from "../../third-party-user/queries.js";
import { validateRadioSelection } from "../../third-party-user/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface DeleteThirdPartyUserSession {
  deleteThirdPartyUser?: {
    userId: string;
    userName: string;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const userId = req.query.id as string | undefined;

  if (!userId) {
    return res.redirect(`/manage-third-party-users${language === "cy" ? "?lng=cy" : ""}`);
  }

  const user = await findThirdPartyUserById(userId);

  if (!user) {
    return res.render("delete-third-party-user/index", {
      ...content,
      errors: [{ text: content.userNotFound }]
    });
  }

  const session = req.session as DeleteThirdPartyUserSession;
  session.deleteThirdPartyUser = {
    userId: user.id,
    userName: user.name
  };

  res.render("delete-third-party-user/index", {
    ...content,
    userName: user.name,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteThirdPartyUserSession;

  if (!session.deleteThirdPartyUser) {
    return res.redirect(`/manage-third-party-users${language === "cy" ? "?lng=cy" : ""}`);
  }

  const confirmDelete = req.body.confirmDelete as string | undefined;
  const validationError = validateRadioSelection(confirmDelete);

  if (validationError) {
    return res.render("delete-third-party-user/index", {
      ...content,
      userName: session.deleteThirdPartyUser.userName,
      errors: [{ ...validationError, text: content.noRadioSelected }]
    });
  }

  if (confirmDelete === "no") {
    const userId = session.deleteThirdPartyUser.userId;
    delete session.deleteThirdPartyUser;
    return res.redirect(`/manage-third-party-user?id=${userId}${language === "cy" ? "&lng=cy" : ""}`);
  }

  await deleteThirdPartyUser(session.deleteThirdPartyUser.userId);

  req.auditMetadata = {
    shouldLog: true,
    action: "DELETE_THIRD_PARTY_USER",
    entityInfo: `ID: ${session.deleteThirdPartyUser.userId}, Name: ${session.deleteThirdPartyUser.userName}`
  };

  delete session.deleteThirdPartyUser;

  res.redirect(`/third-party-user-deleted${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
