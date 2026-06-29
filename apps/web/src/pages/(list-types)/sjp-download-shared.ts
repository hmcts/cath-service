import { downloadBlob, getBlobProperties } from "@hmcts/azure-blob";
import { getContentType } from "@hmcts/publication";
import type { Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["pdf", "xlsx"]);

export async function handleBlobDownload(req: Request, res: Response): Promise<Response> {
  const artefactId = req.query.artefactId as string;
  const type = req.query.type as string;

  if (!artefactId || !UUID_REGEX.test(artefactId) || !type || !ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const extension = `.${type}`;
  const fileName = `${artefactId}${extension}`;
  const fileBuffer = await downloadBlob(fileName);

  if (!fileBuffer) {
    return res.status(404).json({ error: "File not found" });
  }

  res.setHeader("Content-Type", getContentType(extension));
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");

  return res.send(fileBuffer);
}

export async function getAvailableFiles(artefactId: string, prefix: string) {
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}

export function createListDownloadFilesHandler(en: object, cy: object, downloadFilesKey: string): RequestHandler {
  return async (req: Request, res: Response) => {
    const locale = res.locals.locale || "en";
    const artefactId = req.query.artefactId as string;

    if (!artefactId || !UUID_REGEX.test(artefactId)) {
      return res.status(400).render("errors/400", { en, cy, locale });
    }

    const content = locale === "cy" ? cy : en;
    const t = (content as Record<string, unknown>)[downloadFilesKey];
    const prefix = req.path.replace("/list-download-files", "");
    const files = await getAvailableFiles(artefactId, prefix);

    if (files.length === 0) {
      return res.status(404).render("errors/404", { en, cy, locale });
    }

    return res.render("list-download-files", {
      en,
      cy,
      t,
      artefactId,
      locale,
      files
    });
  };
}
