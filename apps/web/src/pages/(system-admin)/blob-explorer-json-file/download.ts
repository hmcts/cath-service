import { requireRole, USER_ROLES } from "@hmcts/auth";
import { GENERATED_FILE_TYPES, getGeneratedFile, isGeneratedFileType } from "@hmcts/publication";
import { recordBlobExplorerDownload } from "@hmcts/system-admin-pages";
import { errorViewsCy, errorViewsEn } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const downloadHandler = async (req: Request, res: Response) => {
  // Express routes HEAD to GET handlers. Refuse it, so a HEAD request can't record a download that never happened.
  if (req.method === "HEAD") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const { artefactId, type } = req.query;

  if (typeof artefactId !== "string" || !UUID_REGEX.test(artefactId) || !isGeneratedFileType(type)) {
    return renderError(res, 400, "error400");
  }

  try {
    const file = await getGeneratedFile(artefactId, type);

    if (!file) {
      return renderError(res, 404, "error404");
    }

    await recordBlobExplorerDownload(req.user, artefactId, type);

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Length", file.buffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${artefactId}${GENERATED_FILE_TYPES[type].extension}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(file.buffer);
  } catch (error) {
    console.error(`Blob Explorer download failed for artefact ${artefactId} (${type}):`, error instanceof Error ? error.message : "unknown error");
    return renderError(res, 500, "error500");
  }
};

function renderError(res: Response, status: 400 | 404 | 500, key: "error400" | "error404" | "error500") {
  const locale = res.locals.locale === "cy" ? "cy" : "en";
  return res.status(status).render(`errors/${status}`, {
    en: errorViewsEn[key],
    cy: errorViewsCy[key],
    t: locale === "cy" ? errorViewsCy[key] : errorViewsEn[key]
  });
}

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), downloadHandler];
