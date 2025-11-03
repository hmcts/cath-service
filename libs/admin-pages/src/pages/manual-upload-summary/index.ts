import { getLocationById } from "@hmcts/location";
import { formatDate, formatDateRange } from "@hmcts/web-core";
import type { Request, Response } from "express";
import "../../manual-upload/model.js";
import { LANGUAGE_LABELS, LIST_TYPE_LABELS, SENSITIVITY_LABELS } from "../../manual-upload/model.js";
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
      listType: LIST_TYPE_LABELS[uploadData.listType] || uploadData.listType,
      hearingStartDate: formatDate(uploadData.hearingStartDate),
      sensitivity: SENSITIVITY_LABELS[uploadData.sensitivity] || uploadData.sensitivity,
      language: LANGUAGE_LABELS[uploadData.language] || uploadData.language,
      displayFileDates: formatDateRange(uploadData.displayFrom, uploadData.displayTo)
    },
    hideLanguageToggle: true
  });
};

export const POST = async (req: Request, res: Response) => {
  delete req.session.manualUploadForm;
  delete req.session.manualUploadSubmitted;
  res.redirect("/manual-upload-success");
};
