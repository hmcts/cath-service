import { requireRole, USER_ROLES } from "@hmcts/auth";
import { deleteThirdPartyUser, findThirdPartyUserById } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

type Language = "en" | "cy";

function renderDeletePage(
  res: Response,
  t: typeof en | typeof cy,
  userId: string,
  userName: string,
  lngParam: string,
  errors?: Array<{ text: string; href?: string }>
) {
  res.render("third-party-users/[id]/delete/index", {
    ...t,
    lngParam,
    userId,
    userName,
    pageTitle: t.pageTitle(userName),
    errors
  });
}

export const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const user = await findThirdPartyUserById(id);
  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  renderDeletePage(res, t, user.id, user.name, lngParam);
};

export const postHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const user = await findThirdPartyUserById(id);
  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  const confirmDelete = req.body.confirmDelete as string | undefined;

  if (!confirmDelete) {
    return renderDeletePage(res, t, user.id, user.name, lngParam, [{ text: t.noRadioSelected, href: "#confirm-delete" }]);
  }

  if (confirmDelete === "no") {
    return res.redirect(`/third-party-users/${id}/manage${lngParam}`);
  }

  await deleteThirdPartyUser(id);

  req.auditMetadata = {
    shouldLog: true,
    action: "DELETE_THIRD_PARTY_USER",
    entityInfo: `Name: ${user.name}, ID: ${id}`
  };

  res.redirect(`/third-party-users/${id}/delete/success${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
