import { requireRole, USER_ROLES } from "@hmcts/auth";
import { deleteCourtSuccessCy as cy, deleteCourtSuccessEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

interface DeleteCourtSession {
  deleteCourt?: {
    locationId: number;
    name: string;
    welshName: string;
  };
}

export const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  delete session.deleteCourt;

  res.render("delete-court-success/index", {
    ...content
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
