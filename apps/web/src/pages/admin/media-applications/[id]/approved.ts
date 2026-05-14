import { mediaApplicationApprovedCy as approvedCy, mediaApplicationApprovedEn as approvedEn, getApplicationById } from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? approvedCy : approvedEn;
  const { id } = req.params;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).render("errors/404", {
        error: lang.errorMessages.notFound
      });
    }

    res.render("media-applications/[id]/approved", {
      pageTitle: lang.pageTitle,
      tableHeaders: lang.tableHeaders,
      whatHappensNextHeading: lang.whatHappensNextHeading,
      whatHappensNextText: lang.whatHappensNextText,
      returnLink: lang.returnLink,
      application
    });
  } catch (_error) {
    res.render("media-applications/[id]/approved", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
