import { randomUUID } from "node:crypto";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import "@hmcts/care-standards-tribunal-weekly-hearing-list"; // Register CST converter (9)
import "@hmcts/rcj-standard-daily-cause-list"; // Register RCJ standard converters (10-17)
import "@hmcts/london-administrative-court-daily-cause-list"; // Register London admin converter (18)
import "@hmcts/court-of-appeal-civil-daily-cause-list"; // Register civil appeal converter (19)
import "@hmcts/administrative-court-daily-cause-list"; // Register admin court converters (20-23)
import { getLocationById } from "@hmcts/location";
import { createArtefact, extractAndStoreArtefactSearch, mockListTypes, Provenance, processPublication } from "@hmcts/publication";
import { formatDate, formatDateRange, parseDate } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { saveUploadedFile } from "../../manual-upload/file-storage.js";
import "../../manual-upload/model.js";
import { LANGUAGE_LABELS, SENSITIVITY_LABELS } from "../../manual-upload/model.js";
import { getNonStrategicUpload } from "../../manual-upload/storage.js";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const uploadId = req.query.uploadId as string;

  if (!uploadId) {
    return res.status(400).send("Missing uploadId");
  }

  const uploadData = await getNonStrategicUpload(uploadId);

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

  res.render("non-strategic-upload-summary/index", {
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
    const uploadData = await getNonStrategicUpload(uploadId);

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

    // Non-strategic publications should always have isFlatFile set to false
    const listTypeId = Number.parseInt(uploadData.listType, 10);
    const isFlatFile = false;

    // Determine if the uploaded file needs conversion (Excel files need conversion to JSON)
    const isExcelFile = !uploadData.fileName?.endsWith(".json");

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
      lastReceivedDate: new Date(),
      isFlatFile,
      provenance: Provenance.MANUAL_UPLOAD,
      noMatch: false
    });

    // Save file to temporary storage with artefactId as filename (will overwrite if exists)
    await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);

    // If this is a non-strategic list and it's an Excel file,
    // convert it to JSON (validation already done on upload page)
    const selectedListType = mockListTypes.find((lt) => lt.id === listTypeId);
    let jsonData: unknown;

    if (isExcelFile && selectedListType?.isNonStrategic) {
      const { convertExcelForListType, hasConverterForListType } = await import("@hmcts/list-types-common");

      if (hasConverterForListType(listTypeId)) {
        const hearingsData = await convertExcelForListType(listTypeId, uploadData.file);
        await saveUploadedFile(artefactId, `${artefactId}.json`, Buffer.from(JSON.stringify(hearingsData)));

        // Extract and store artefact search data from converted JSON
        try {
          await extractAndStoreArtefactSearch(artefactId, listTypeId, hearingsData);
        } catch (error) {
          console.error("[Non-Strategic Upload] Failed to extract artefact search data from converted Excel", {
            artefactId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } else {
      // Parse JSON data for JSON files
      try {
        jsonData = JSON.parse(uploadData.file.toString("utf8"));
      } catch {
        // Not valid JSON
      }
    }

    // Generate PDF and send notifications using common processor
    await processPublication({
      artefactId,
      locationId: uploadData.locationId,
      listTypeId,
      contentDate,
      locale: uploadData.language === "WELSH" ? "cy" : "en",
      jsonData,
      provenance: Provenance.MANUAL_UPLOAD,
      displayFrom,
      displayTo,
      logPrefix: "[Non-Strategic Upload]"
    });

    // Clear session data
    delete req.session.nonStrategicUploadForm;
    delete req.session.nonStrategicUploadSubmitted;

    // Set success flag for success page validation
    req.session.nonStrategicUploadConfirmed = true;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Redirect to success page with language parameter
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    res.redirect(`/non-strategic-upload-success${lng}`);
  } catch (error) {
    console.error("Upload processing error:", error);

    // Keep session data and render error on the same page
    const uploadData = await getNonStrategicUpload(uploadId);
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

    // Extract error message from error object
    const errorMessage = error instanceof Error ? error.message : "We could not process your upload. Please try again.";

    return res.render("non-strategic-upload-summary/index", {
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
      errors: [{ text: errorMessage, href: "#" }],
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
