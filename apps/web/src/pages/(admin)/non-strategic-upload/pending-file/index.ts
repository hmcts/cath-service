import { sendPendingFile } from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  await sendPendingFile(res, "non-strategic-upload", req.session.nonStrategicUploadPendingFile);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
