import { requireRole, USER_ROLES } from "@hmcts/auth";
import { generateReferenceDataCsv } from "@hmcts/system-admin-pages";
import type { RequestHandler, Response } from "express";

const getHandler = async (_req: any, res: Response) => {
  const csvContent = await generateReferenceDataCsv();

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="reference-data-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csvContent);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
