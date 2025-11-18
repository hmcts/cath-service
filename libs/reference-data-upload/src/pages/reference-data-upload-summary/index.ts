import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { parseCsv } from "../../csv-parser.js";
import { enrichLocationData } from "../../enrichment-service.js";
import type { UploadSessionData } from "../../model.js";
import { upsertLocations } from "../../upload-repository.js";
import { validateLocationData } from "../../validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

function saveSession(session: any): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err: any) => (err ? reject(err) : resolve()));
  });
}

const getHandler = async (req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);

  const uploadData: UploadSessionData | undefined = req.session.uploadData;

  if (!uploadData) {
    return res.redirect("/reference-data-upload");
  }

  // Convert fileBuffer back to Buffer if it was serialized
  const fileBuffer = Buffer.isBuffer(uploadData.fileBuffer)
    ? uploadData.fileBuffer
    : Buffer.from(uploadData.fileBuffer);

  // Parse CSV
  const parseResult = parseCsv(fileBuffer);

  if (!parseResult.success) {
    console.log("Parse errors:", parseResult.errors);
    req.session.uploadErrors = parseResult.errors.map((err) => ({
      text: err,
      href: "#file"
    }));
    delete req.session.uploadData;
    await saveSession(req.session);
    return res.redirect("/reference-data-upload");
  }

  console.log("Parsed data:", JSON.stringify(parseResult.data, null, 2));

  // Validate data
  const validationErrors = await validateLocationData(parseResult.data);

  if (validationErrors.length > 0) {
    console.log("Validation errors:", validationErrors);
    return res.render("reference-data-upload-summary/index", {
      ...t,
      fileName: uploadData.fileName,
      errors: validationErrors,
      hasErrors: true,
      locale
    });
  }

  // Enrich data for preview
  const enrichedData = await enrichLocationData(parseResult.data);

  // Pagination
  const page = Number.parseInt((req.query.page as string) || "1", 10);
  const itemsPerPage = 10;
  const totalItems = enrichedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = enrichedData.slice(startIndex, endIndex);

  // Build pagination items
  const paginationItems = [];
  for (let i = 1; i <= totalPages; i++) {
    paginationItems.push({
      number: i,
      href: `/reference-data-upload-summary?page=${i}`,
      current: i === page
    });
  }

  res.render("reference-data-upload-summary/index", {
    ...t,
    fileName: uploadData.fileName,
    previewData: paginatedData,
    hasErrors: false,
    locale,
    pagination: {
      items: paginationItems,
      previous: page > 1 ? { href: `/reference-data-upload-summary?page=${page - 1}` } : undefined,
      next: page < totalPages ? { href: `/reference-data-upload-summary?page=${page + 1}` } : undefined
    },
    showPagination: totalPages > 1
  });
};

const postHandler = async (req: Request, res: Response) => {
  const uploadData: UploadSessionData | undefined = req.session.uploadData;

  if (!uploadData) {
    return res.redirect("/reference-data-upload");
  }

  // Convert fileBuffer back to Buffer if it was serialized
  const fileBuffer = Buffer.isBuffer(uploadData.fileBuffer)
    ? uploadData.fileBuffer
    : Buffer.from(uploadData.fileBuffer);

  // Re-parse and validate
  const parseResult = parseCsv(fileBuffer);

  if (!parseResult.success) {
    req.session.uploadErrors = parseResult.errors.map((err) => ({
      text: err,
      href: "#file"
    }));
    delete req.session.uploadData;
    await saveSession(req.session);
    return res.redirect("/reference-data-upload");
  }

  const validationErrors = await validateLocationData(parseResult.data);

  if (validationErrors.length > 0) {
    req.session.uploadErrors = validationErrors;
    delete req.session.uploadData;
    await saveSession(req.session);
    return res.redirect("/reference-data-upload");
  }

  // Upload to database
  await upsertLocations(parseResult.data);

  // Clear session data
  delete req.session.uploadData;
  await saveSession(req.session);

  res.redirect("/reference-data-upload-confirmation");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
