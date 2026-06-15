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
  const filterToRemove = req.query.filter as string;
  const filterValue = req.query.value as string;

  if (session.userManagement?.filters) {
    const filters = session.userManagement.filters;

    if (filterToRemove === "email") {
      delete filters.email;
    } else if (filterToRemove === "userId") {
      delete filters.userId;
    } else if (filterToRemove === "userProvenanceId") {
      delete filters.userProvenanceId;
    } else if (filterToRemove === "role" && filterValue && filters.roles) {
      filters.roles = filters.roles.filter((r) => r !== filterValue);
      if (filters.roles.length === 0) {
        delete filters.roles;
      }
    } else if (filterToRemove === "provenance" && filterValue && filters.provenances) {
      filters.provenances = filters.provenances.filter((p) => p !== filterValue);
      if (filters.provenances.length === 0) {
        delete filters.provenances;
      }
    }

    // Reset page to 1 after removing a filter to avoid out-of-range results
    session.userManagement.page = 1;
  }

  const lngParam = language === "cy" ? "?lng=cy" : "";
  res.redirect(`/find-users${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
