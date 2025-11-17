import path from "node:path";
import { getArtefactById, getUploadedFile, mockListTypes } from "@hmcts/publication";
import { formatDateAndLocale } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  console.log("[file-publication-data] Received request for artefactId:", artefactId);

  if (!artefactId) {
    console.log("[file-publication-data] Missing artefactId");
    return res.status(400).send("Missing artefactId");
  }

  const file = await getUploadedFile(artefactId);

  if (!file) {
    console.log("[file-publication-data] File not found for artefactId:", artefactId, "rendering error page");
    return res.status(404).render("file-publication/artefact-not-found", t);
  }

  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    console.log("[file-publication-data] Artefact metadata not found for artefactId:", artefactId);
    return res.status(404).render("file-publication/artefact-not-found", t);
  }

  const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
  const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.englishFriendlyName || "Unknown";
  const formattedDate = formatDateAndLocale(artefact.contentDate.toISOString(), locale);
  const languageLabel = artefact.language === "ENGLISH" ? "English (Saesneg)" : "Welsh (Cymraeg)";

  const { fileData, fileName } = file;
  const fileExtension = path.extname(fileName);
  const displayFileName = `${listTypeName} ${formattedDate} - ${languageLabel}${fileExtension}`;

  console.log("[file-publication-data] Serving file:", displayFileName, "Size:", fileData.length, "bytes");

  // Encode filename for Content-Disposition header (RFC 6266)
  // Escape quotes and backslashes for the filename parameter
  const escapedFileName = displayFileName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  // URL-encode for filename* parameter for better browser compatibility
  const encodedFileName = encodeURIComponent(displayFileName);

  if (fileName.endsWith(".pdf")) {
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="${escapedFileName}"; filename*=UTF-8''${encodedFileName}`);
  } else if (fileName.endsWith(".json")) {
    res.set("Content-Type", "application/json");
    res.set("Content-Disposition", `attachment; filename="${escapedFileName}"; filename*=UTF-8''${encodedFileName}`);
  } else {
    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${escapedFileName}"; filename*=UTF-8''${encodedFileName}`);
  }
  res.send(fileData);
};
