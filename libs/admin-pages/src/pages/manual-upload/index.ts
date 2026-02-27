import { requireRole, USER_ROLES } from "@hmcts/auth";
import "@hmcts/web-core"; // Import for Express type augmentation
import { getAllLocations, getLocationById } from "@hmcts/location";
import { Language, mockListTypes } from "@hmcts/publication";
import type { Request, RequestHandler, Response } from "express";
import "../../manual-upload/model.js";
import { LANGUAGE_LABELS, SENSITIVITY_LABELS, type UploadFormData } from "../../manual-upload/model.js";
import { storeManualUpload } from "../../manual-upload/storage.js";
import { validateManualUploadForm } from "../../manual-upload/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LIST_TYPES = [
  { value: "", text: "<Please choose a list type>" },
  ...mockListTypes.filter((listType) => !listType.isNonStrategic).map((listType) => ({ value: listType.id.toString(), text: listType.englishFriendlyName }))
];

const SENSITIVITY_OPTIONS = [
  { value: "", text: "<Please choose a sensitivity>" },
  ...Object.entries(SENSITIVITY_LABELS).map(([value, text]) => ({ value, text }))
];

const LANGUAGE_OPTIONS = [{ value: "", text: "" }, ...Object.entries(LANGUAGE_LABELS).map(([value, text]) => ({ value, text }))];

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const hasValue = (val: any) => val !== undefined && val !== null && val !== "" && val.toString().trim() !== "";

function parseDateInput(body: any, prefix: string) {
  const day = body[`${prefix}-day`];
  const month = body[`${prefix}-month`];
  const year = body[`${prefix}-year`];

  return hasValue(day) || hasValue(month) || hasValue(year) ? { day: day || "", month: month || "", year: year || "" } : undefined;
}

function transformDateFields(body: any): UploadFormData {
  return {
    locationId: body.locationId,
    locationName: body["court-display"],
    listType: body.listType,
    hearingStartDate: parseDateInput(body, "hearingStartDate"),
    sensitivity: body.sensitivity,
    language: body.language,
    displayFrom: parseDateInput(body, "displayFrom"),
    displayTo: parseDateInput(body, "displayTo")
  };
}

function saveSession(session: any): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err: any) => (err ? reject(err) : resolve()));
  });
}

function selectOption(options: any[], selectedValue: string | undefined) {
  return options.map((item) => ({ ...item, selected: item.value === selectedValue }));
}

const getHandler = async (req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);

  // Clear upload confirmation flags when starting a new upload
  delete req.session.uploadConfirmed;
  delete req.session.successPageViewed;
  delete req.session.viewedLanguage;

  const wasSubmitted = req.session.manualUploadSubmitted || false;
  let formData = req.session.manualUploadForm || {};
  const errors = req.session.manualUploadErrors || [];

  delete req.session.manualUploadErrors;

  // Clear form data on refresh if not successfully submitted
  if (!wasSubmitted) {
    delete req.session.manualUploadForm;
  }

  // Support pre-filling from query parameter
  if (req.query.locationId && !formData.locationId) {
    formData = { ...formData, locationId: req.query.locationId as string };
  }

  // Resolve location name from ID or use stored name
  const locationId = formData.locationId ? Number.parseInt(formData.locationId, 10) : null;
  const location = locationId && !Number.isNaN(locationId) ? await getLocationById(locationId) : null;
  const locationName = location?.name || formData.locationName || "";

  res.render("manual-upload/index", {
    ...t,
    errors: errors.length > 0 ? errors : undefined,
    data: { ...formData, locationName },
    locations: await getAllLocations(locale),
    listTypes: selectOption(LIST_TYPES, formData.listType),
    sensitivityOptions: selectOption(SENSITIVITY_OPTIONS, formData.sensitivity),
    languageOptions: selectOption(LANGUAGE_OPTIONS, formData.language || Language.ENGLISH),
    locale
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = "en" as "en" | "cy";
  const t = getTranslations(locale);

  const formData = transformDateFields(req.body);

  // Check for multer errors (e.g., file too large)
  const fileUploadError = req.fileUploadError;
  let errors = await validateManualUploadForm(formData, req.file, t);

  // If multer threw a file size error, replace the "fileRequired" error with the file size error
  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors = errors.filter((e) => e.text !== t.errorMessages.fileRequired);
    errors = [{ text: t.errorMessages.fileSize, href: "#file" }, ...errors];
  }

  if (errors.length > 0) {
    req.session.manualUploadErrors = errors;
    req.session.manualUploadForm = formData;
    await saveSession(req.session);
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

  req.session.manualUploadForm = formData;
  req.session.manualUploadSubmitted = true;
  await saveSession(req.session);

  res.redirect(`/manual-upload-summary?uploadId=${uploadId}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
