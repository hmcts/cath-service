import { randomUUID } from "node:crypto";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { createArtefact, mockListTypes, Provenance, saveUploadedFile } from "@hmcts/publication";
import { formatDate, formatDateRange, parseDate } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import "../../manual-upload/model.js";
import { LANGUAGE_LABELS, SENSITIVITY_LABELS } from "../../manual-upload/model.js";
import { getManualUpload } from "../../manual-upload/storage.js";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const uploadId = req.query.uploadId as string;

  if (!uploadId) {
    return res.status(400).send("Missing uploadId");
  }

  const uploadData = await getManualUpload(uploadId);

  if (!uploadData) {
    return res.status(404).send("Upload not found");
  }

  const locale = req.query.lng === "cy" ? "cy" : "en";
  const location = await getLocationById(Number.parseInt(uploadData.locationId, 10));
  const courtName = location ? (locale === "cy" ? location.welshName : location.name) : uploadData.locationId;

  // Find list type by ID
  const listTypeId = uploadData.listType ? Number.parseInt(uploadData.listType, 10) : null;
  const listType = listTypeId ? mockListTypes.find((lt) => lt.id === listTypeId) : null;
  const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : uploadData.listType;

  res.render("manual-upload-summary/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    subHeading: lang.subHeading,
    courtName: lang.courtName,
    file: lang.file,
    listType: lang.listType,
    hearingStartDate: lang.hearingStartDate,
    sensitivity: lang.sensitivity,
    language: lang.language,
    displayFileDates: lang.displayFileDates,
    change: lang.change,
    confirmButton: lang.confirmButton,
    data: {
      courtName,
      file: uploadData.fileName,
      listType: listTypeName,
      hearingStartDate: formatDate(uploadData.hearingStartDate),
      sensitivity: SENSITIVITY_LABELS[uploadData.sensitivity] || uploadData.sensitivity,
      language: LANGUAGE_LABELS[uploadData.language] || uploadData.language,
      displayFileDates: formatDateRange(uploadData.displayFrom, uploadData.displayTo)
    },
    hideLanguageToggle: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const uploadId = req.query.uploadId as string;

  if (!uploadId) {
    return res.status(400).send("Missing uploadId");
  }

  try {
    // Retrieve upload data from Redis
    const uploadData = await getManualUpload(uploadId);

    if (!uploadData) {
      return res.status(404).send("Upload not found");
    }

    // Parse date inputs to Date objects
    const contentDate = parseDate(uploadData.hearingStartDate);
    const displayFrom = parseDate(uploadData.displayFrom);
    const displayTo = parseDate(uploadData.displayTo);

    if (!contentDate || !displayFrom || !displayTo) {
      throw new Error("Invalid date format");
    }

    // Determine if file is flat file based on extension (JSON files are structured, others are flat)
    const listTypeId = Number.parseInt(uploadData.listType, 10);
    const isFlatFile = !uploadData.fileName?.endsWith(".json");

    // Store metadata in database (creates new or updates existing)
    const artefactId = await createArtefact({
      artefactId: randomUUID(),
      locationId: uploadData.locationId,
      listTypeId,
      contentDate,
      sensitivity: uploadData.sensitivity,
      language: uploadData.language,
      displayFrom,
      displayTo,
      isFlatFile,
      provenance: Provenance.MANUAL_UPLOAD
    });

    // Save file to temporary storage with artefactId as filename (will overwrite if exists)
    await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);

    // Clear session data
    delete req.session.manualUploadForm;
    delete req.session.manualUploadSubmitted;

    // Set success flag for success page validation
    req.session.uploadConfirmed = true;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Redirect to success page with language parameter
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    res.redirect(`/manual-upload-success${lng}`);
  } catch (error) {
    console.error("Upload processing error:", error);

    // Keep session data and render error on the same page
    const uploadData = await getManualUpload(uploadId);
    if (!uploadData) {
      return res.status(500).send("Error processing upload");
    }

    const locale = req.query.lng === "cy" ? "cy" : "en";
    const location = await getLocationById(Number.parseInt(uploadData.locationId, 10));
    const courtName = location ? (locale === "cy" ? location.welshName : location.name) : uploadData.locationId;

    // Find list type by ID
    const listTypeId = uploadData.listType ? Number.parseInt(uploadData.listType, 10) : null;
    const listType = listTypeId ? mockListTypes.find((lt) => lt.id === listTypeId) : null;
    const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : uploadData.listType;

    return res.render("manual-upload-summary/index", {
      pageTitle: lang.pageTitle,
      heading: lang.heading,
      subHeading: lang.subHeading,
      courtName: lang.courtName,
      file: lang.file,
      listType: lang.listType,
      hearingStartDate: lang.hearingStartDate,
      sensitivity: lang.sensitivity,
      language: lang.language,
      displayFileDates: lang.displayFileDates,
      change: lang.change,
      confirmButton: lang.confirmButton,
      data: {
        courtName,
        file: uploadData.fileName,
        listType: listTypeName,
        hearingStartDate: formatDate(uploadData.hearingStartDate),
        sensitivity: SENSITIVITY_LABELS[uploadData.sensitivity] || uploadData.sensitivity,
        language: LANGUAGE_LABELS[uploadData.language] || uploadData.language,
        displayFileDates: formatDateRange(uploadData.displayFrom, uploadData.displayTo)
      },
      errors: [{ text: "We could not process your upload. Please try again.", href: "#" }],
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
