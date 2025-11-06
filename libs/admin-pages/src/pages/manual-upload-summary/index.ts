import { randomUUID } from "node:crypto";
import { getLocationById } from "@hmcts/location";
import { createArtefact, mockListTypes } from "@hmcts/publication";
import { cy as coreLocales, en as coreLocalesEn, formatDate, formatDateRange, parseDate } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { saveUploadedFile } from "../../manual-upload/file-storage.js";
import "../../manual-upload/model.js";
import { LANGUAGE_LABELS, SENSITIVITY_LABELS } from "../../manual-upload/model.js";
import { getManualUpload } from "../../manual-upload/storage.js";
import cy from "./cy.js";
import en from "./en.js";

export const GET = async (req: Request, res: Response) => {
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
  const location = getLocationById(Number.parseInt(uploadData.locationId, 10));
  const courtName = location ? (locale === "cy" ? location.welshName : location.name) : uploadData.locationId;
  const coreAuthNavigation = locale === "cy" ? coreLocales.authenticatedNavigation : coreLocalesEn.authenticatedNavigation;

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
    navigation: {
      signOut: coreAuthNavigation.signOut
    },
    hideLanguageToggle: true
  });
};

export const POST = async (req: Request, res: Response) => {
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

    // Generate artefact ID
    const artefactId = randomUUID();

    // Save file to temporary storage with artefactId as filename
    await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);

    // Parse date inputs to Date objects
    const contentDate = parseDate(uploadData.hearingStartDate);
    const displayFrom = parseDate(uploadData.displayFrom);
    const displayTo = parseDate(uploadData.displayTo);

    if (!contentDate || !displayFrom || !displayTo) {
      throw new Error("Invalid date format");
    }

    // Store metadata in database
    await createArtefact({
      artefactId,
      locationId: uploadData.locationId,
      listTypeId: Number.parseInt(uploadData.listType, 10),
      contentDate,
      sensitivity: uploadData.sensitivity,
      language: uploadData.language,
      displayFrom,
      displayTo
    });

    // Clear session data
    delete req.session.manualUploadForm;
    delete req.session.manualUploadSubmitted;

    // Set success flag for success page validation
    req.session.uploadConfirmed = true;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
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
    const location = getLocationById(Number.parseInt(uploadData.locationId, 10));
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
