import "@hmcts/ast-daily-hearing-list"; // Register AST converter
import "@hmcts/care-standards-tribunal-weekly-hearing-list"; // Register CST converter
import "@hmcts/sscs-daily-hearing-list"; // Register SSCS converters (28-35)
import "@hmcts/cic-weekly-hearing-list"; // Register CIC converter
import "@hmcts/send-daily-hearing-list"; // Register SEND converter
import "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list"; // Register UTCC converter
import "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list"; // Register UTLC converter
import "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list"; // Register UTAAC converter
import "@hmcts/business-and-property-division-rolls-building-daily-cause-list"; // Register Business and Property Division Rolls Building converter
import "@hmcts/interim-applications-daily-cause-list"; // Register Interim Applications converter
import {
  deletePendingFile,
  LANGUAGE_LABELS,
  retainPendingFile,
  SENSITIVITY_LABELS,
  storeNonStrategicUpload,
  type UploadFormData,
  validateNonStrategicUploadForm
} from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getAllLocations, getLocationById } from "@hmcts/location";
import { Language } from "@hmcts/publication";
import { findListTypeById, findNonStrategicListTypes } from "@hmcts/system-admin-pages";
import { saveSession } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const PENDING_FILE_PREFIX = "non-strategic-upload";

async function getListTypesData() {
  const nonStrategicListTypes = await findNonStrategicListTypes();
  const options = [
    { value: "", text: "<Please choose a list type>" },
    ...nonStrategicListTypes.map((listType) => ({
      value: listType.id.toString(),
      text: listType.shortenedFriendlyName || listType.friendlyName || listType.name
    }))
  ];
  const sensitivityMap = Object.fromEntries(
    nonStrategicListTypes.map((listType) => [listType.id.toString(), listType.defaultSensitivity?.toUpperCase() ?? ""])
  );
  return { options, sensitivityMap };
}

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

function selectOption(options: { value: string; text: string }[], selectedValue: string | undefined) {
  return options.map((item) => ({ ...item, selected: item.value === selectedValue }));
}

const getHandler = async (req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);

  // Clear upload confirmation flags when starting a new upload
  delete req.session.nonStrategicUploadConfirmed;
  delete req.session.nonStrategicSuccessPageViewed;

  const wasSubmitted = req.session.nonStrategicUploadSubmitted || false;
  let formData = req.session.nonStrategicUploadForm || {};
  const errors = req.session.nonStrategicUploadErrors || [];

  delete req.session.nonStrategicUploadErrors;

  // The kept file is only offered straight after a failed submit; a refresh or the summary "Change" link drops it.
  const pendingFile = errors.length > 0 ? req.session.nonStrategicUploadPendingFile : undefined;
  if (!pendingFile) {
    await discardPendingFile(req);
  }

  // Clear form data on refresh if not successfully submitted
  if (!wasSubmitted) {
    delete req.session.nonStrategicUploadForm;
  }

  // Support pre-filling from query parameter
  if (req.query.locationId && !formData.locationId) {
    formData = { ...formData, locationId: req.query.locationId as string };
  }

  // Resolve location name from ID or use stored name
  const locationId = formData.locationId ? Number.parseInt(formData.locationId, 10) : null;
  const location = locationId && !Number.isNaN(locationId) ? await getLocationById(locationId) : null;
  const locationName = location?.name || formData.locationName || "";

  const [{ options: listTypeOptions, sensitivityMap }, locations] = await Promise.all([getListTypesData(), getAllLocations(locale)]);

  res.render("non-strategic-upload/index", {
    ...t,
    errors: errors.length > 0 ? errors : undefined,
    data: { ...formData, locationName },
    locations,
    listTypes: selectOption(listTypeOptions, formData.listType),
    sensitivityOptions: selectOption(SENSITIVITY_OPTIONS, formData.sensitivity),
    languageOptions: selectOption(LANGUAGE_OPTIONS, formData.language || Language.ENGLISH),
    listTypeSensitivityMap: JSON.stringify(sensitivityMap),
    pendingFileName: pendingFile?.fileName,
    pendingFileUrl: pendingFile ? "/non-strategic-upload/pending-file" : undefined,
    locale
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = "en" as "en" | "cy";
  const t = getTranslations(locale);

  const formData = transformDateFields(req.body);

  // Check for multer errors (e.g., file too large)
  const fileUploadError = req.fileUploadError;
  const file = req.file;
  let errors = await validateNonStrategicUploadForm(formData, file, t);

  // If multer threw a file size error, replace the "fileRequired" error with the file size error
  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors = errors.filter((e) => e.text !== t.errorMessages.fileRequired);
    errors = [{ text: t.errorMessages.fileSize, href: "#file" }, ...errors];
  }

  if (errors.length > 0) {
    req.session.nonStrategicUploadPendingFile = await retainPendingFile(PENDING_FILE_PREFIX, req.session.nonStrategicUploadPendingFile, req.file, errors);
    req.session.nonStrategicUploadErrors = errors;
    req.session.nonStrategicUploadForm = formData;
    await saveSession(req.session);
    return res.redirect("/non-strategic-upload");
  }

  // Validate Excel file for non-strategic lists that require validation
  const listTypeId = formData.listType ? Number.parseInt(formData.listType, 10) : null;
  const selectedListType = listTypeId ? await findListTypeById(listTypeId) : null;
  const isExcelFile = file!.originalname?.endsWith(".xlsx") || file!.originalname?.endsWith(".xls");

  if (selectedListType?.isNonStrategic && isExcelFile) {
    try {
      const { convertExcelForListTypeName, hasConverterForListTypeName } = await import("@hmcts/list-types-common");
      const listTypeName = selectedListType.name;

      if (listTypeName && hasConverterForListTypeName(listTypeName)) {
        await convertExcelForListTypeName(listTypeName, file!.buffer);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid Excel file format";
      errors = [{ text: errorMessage, href: "#file" }];
      await discardPendingFile(req);
      req.session.nonStrategicUploadErrors = errors;
      req.session.nonStrategicUploadForm = formData;
      await saveSession(req.session);
      return res.redirect("/non-strategic-upload");
    }
  }

  const uploadId = await storeNonStrategicUpload({
    file: file!.buffer,
    fileName: file!.originalname,
    fileType: file!.mimetype,
    locationId: formData.locationId!,
    listType: formData.listType!,
    hearingStartDate: formData.hearingStartDate!,
    sensitivity: formData.sensitivity!,
    language: formData.language!,
    displayFrom: formData.displayFrom!,
    displayTo: formData.displayTo!
  });

  await discardPendingFile(req);
  req.session.nonStrategicUploadForm = formData;
  req.session.nonStrategicUploadSubmitted = true;
  await saveSession(req.session);

  res.redirect(`/non-strategic-upload-summary?uploadId=${uploadId}`);
};

async function discardPendingFile(req: Request) {
  const reference = req.session.nonStrategicUploadPendingFile;
  if (reference) {
    await deletePendingFile(PENDING_FILE_PREFIX, reference.id);
    delete req.session.nonStrategicUploadPendingFile;
  }
}

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
