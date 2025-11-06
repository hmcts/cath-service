import { getAllLocations, getLocationById } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import type { DateInput } from "@hmcts/web-core";
import { en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import "../../manual-upload/model.js";
import { LANGUAGE_LABELS, LIST_TYPE_LABELS, type ManualUploadFormData, SENSITIVITY_LABELS } from "../../manual-upload/model.js";
import { storeManualUpload } from "../../manual-upload/storage.js";
import { validateForm } from "../../manual-upload/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LIST_TYPES = [{ value: "", text: "<Please choose a list type>" }, ...Object.entries(LIST_TYPE_LABELS).map(([value, text]) => ({ value, text }))];

const SENSITIVITY_OPTIONS = [
  { value: "", text: "<Please choose a sensitivity>" },
  ...Object.entries(SENSITIVITY_LABELS).map(([value, text]) => ({ value, text }))
];

const LANGUAGE_OPTIONS = [{ value: "", text: "" }, ...Object.entries(LANGUAGE_LABELS).map(([value, text]) => ({ value, text }))];

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

function transformDateFields(body: any): ManualUploadFormData {
  const hasValue = (val: any) => val !== undefined && val !== null && val !== "" && val.toString().trim() !== "";

  return {
    locationId: body.locationId,
    locationName: body["court-display"], // Capture the display value from autocomplete
    listType: body.listType,
    hearingStartDate:
      hasValue(body["hearingStartDate-day"]) || hasValue(body["hearingStartDate-month"]) || hasValue(body["hearingStartDate-year"])
        ? {
            day: body["hearingStartDate-day"] || "",
            month: body["hearingStartDate-month"] || "",
            year: body["hearingStartDate-year"] || ""
          }
        : undefined,
    sensitivity: body.sensitivity,
    language: body.language,
    displayFrom:
      hasValue(body["displayFrom-day"]) || hasValue(body["displayFrom-month"]) || hasValue(body["displayFrom-year"])
        ? {
            day: body["displayFrom-day"] || "",
            month: body["displayFrom-month"] || "",
            year: body["displayFrom-year"] || ""
          }
        : undefined,
    displayTo:
      hasValue(body["displayTo-day"]) || hasValue(body["displayTo-month"]) || hasValue(body["displayTo-year"])
        ? {
            day: body["displayTo-day"] || "",
            month: body["displayTo-month"] || "",
            year: body["displayTo-year"] || ""
          }
        : undefined
  };
}

export const GET = async (req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);
  const coreAuthNavigation = coreLocalesEn.authenticatedNavigation;

  // Check if form was successfully submitted to summary page
  const wasSubmitted = req.session.manualUploadSubmitted || false;

  // Restore form data from session if it exists
  let formData = req.session.manualUploadForm || {};
  const errors = req.session.manualUploadErrors || [];

  // Clear errors from session after reading
  delete req.session.manualUploadErrors;

  // If form wasn't successfully submitted yet (still on manual-upload after error or initial load),
  // clear the form data from session so refresh will clear it
  if (!wasSubmitted) {
    delete req.session.manualUploadForm;
  }

  // Support pre-filling from query parameter (for testing and deep linking)
  const queryLocationId = req.query.locationId as string;
  if (queryLocationId && !formData.locationId) {
    formData = { ...formData, locationId: queryLocationId };
  }

  let locationName: string;
  if (formData.locationId && !Number.isNaN(Number(formData.locationId))) {
    const location = getLocationById(Number.parseInt(formData.locationId, 10));
    locationName = location ? location.name : "";
  } else {
    locationName = formData.locationName || "";
  }

  res.render("manual-upload/index", {
    ...t,
    errors: errors.length > 0 ? errors : undefined,
    data: { ...formData, locationName },
    locations: getAllLocations(locale),
    listTypes: LIST_TYPES.map((item) => ({ ...item, selected: item.value === formData.listType })),
    sensitivityOptions: SENSITIVITY_OPTIONS.map((item) => ({ ...item, selected: item.value === formData.sensitivity })),
    languageOptions: LANGUAGE_OPTIONS.map((item) => ({ ...item, selected: item.value === (formData.language || Language.ENGLISH) })),
    locale,
    navigation: {
      signOut: coreAuthNavigation.signOut
    },
    hideLanguageToggle: true
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = "en" as "en" | "cy";
  const t = getTranslations(locale);

  const formData = transformDateFields(req.body);

  // Check for multer errors (e.g., file too large)
  const fileUploadError = (req as any).fileUploadError;
  let errors = validateForm(formData, req.file, t);

  // If multer threw a file size error, replace the "fileRequired" error with the file size error
  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors = errors.filter((e) => e.text !== t.errorMessages.fileRequired);
    errors = [{ text: t.errorMessages.fileSize, href: "#file" }, ...errors];
  }

  if (errors.length > 0) {
    // Save errors and form data to session
    req.session.manualUploadErrors = errors;
    req.session.manualUploadForm = formData;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Redirect to GET to prevent browser caching of POST response
    return res.redirect("/manual-upload");
  }

  const uploadId = await storeManualUpload({
    file: req.file!.buffer,
    fileName: req.file!.originalname,
    fileType: req.file!.mimetype,
    locationId: formData.locationId!,
    listType: formData.listType!,
    hearingStartDate: formData.hearingStartDate!,
    sensitivity: formData.sensitivity!,
    language: formData.language!,
    displayFrom: formData.displayFrom!,
    displayTo: formData.displayTo!
  });

  // Save form data to session and mark as successfully submitted
  req.session.manualUploadForm = formData;
  req.session.manualUploadSubmitted = true;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res.redirect(`/manual-upload-summary?uploadId=${uploadId}`);
};
