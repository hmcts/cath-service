import { getBlobProperties } from "@hmcts/azure-blob";
import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireVerified: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "VERIFIED") return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/sign-in");
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.query.artefactId as string;

  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    return res.status(400).render("errors/400", { en, cy, locale });
  }

  const t = locale === "cy" ? cy.downloadFiles : en.downloadFiles;
  const prefix = req.path.replace("/list-download-files", "");
  const files = await getAvailableFiles(artefactId, prefix);

  if (files.length === 0) {
    return res.status(404).render("errors/404", { en, cy, locale });
  }

  res.render("list-download-files", {
    en,
    cy,
    t,
    artefactId,
    locale,
    files
  });
};

async function getAvailableFiles(artefactId: string, prefix: string) {
  const files: { type: string; url: string; sizeLabel: string }[] = [];

  const [pdfProps, excelProps] = await Promise.all([getBlobProperties(`${artefactId}.pdf`), getBlobProperties(`${artefactId}.xlsx`)]);

  if (pdfProps) {
    files.push({
      type: "pdf",
      url: `${prefix}/download?artefactId=${artefactId}&type=pdf`,
      sizeLabel: formatFileSize(pdfProps.size)
    });
  }

  if (excelProps) {
    files.push({
      type: "xlsx",
      url: `${prefix}/download?artefactId=${artefactId}&type=xlsx`,
      sizeLabel: formatFileSize(excelProps.size)
    });
  }

  return files;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}

export const GET: RequestHandler[] = [requireVerified, getHandler];
