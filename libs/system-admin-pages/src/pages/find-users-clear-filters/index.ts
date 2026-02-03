import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";

interface UserManagementSession {
  userManagement?: {
    filters?: {
      email?: string;
      userId?: string;
      userProvenanceId?: string;
      roles?: string[];
      provenances?: string[];
    };
    page?: number;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const session = req.session as UserManagementSession;

  if (session.userManagement) {
    session.userManagement.filters = {};
    session.userManagement.page = 1;
  }

  const lngParam = language === "cy" ? "?lng=cy" : "";
  res.redirect(`/find-users${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
