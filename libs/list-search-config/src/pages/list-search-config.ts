import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import * as service from "../list-search-config-service.js";

const en = {
  pageTitle: "Configure list search fields",
  heading: "Configure list search fields",
  body: "Enter the JSON field names used to extract case details for this list type.",
  caseNumberFieldLabel: "Case number JSON field name",
  caseNameFieldLabel: "Case name JSON field name",
  saveButton: "Save configuration",
  errorSummaryTitle: "There is a problem",
  errorCaseNumberRequired: "Enter the case number JSON field name",
  errorCaseNumberInvalid: "Case number field name must contain only letters, numbers and underscores",
  errorCaseNameRequired: "Enter the case name JSON field name",
  errorCaseNameInvalid: "Case name field name must contain only letters, numbers and underscores"
};

const cy = {
  pageTitle: "Ffurfweddu meysydd chwilio rhestr",
  heading: "Ffurfweddu meysydd chwilio rhestr",
  body: "Rhowch yr enwau meysydd JSON a ddefnyddir i dynnu manylion achosion ar gyfer y math o restr hwn.",
  caseNumberFieldLabel: "Enw maes JSON rhif achos",
  caseNameFieldLabel: "Enw maes JSON enw achos",
  saveButton: "Cadw ffurfweddiad",
  errorSummaryTitle: "Mae problem wedi codi",
  errorCaseNumberRequired: "Rhowch enw maes JSON rhif yr achos",
  errorCaseNumberInvalid: "Rhaid i enw maes rhif yr achos gynnwys llythrennau, rhifau a thanlinellau yn unig",
  errorCaseNameRequired: "Rhowch enw maes JSON enw'r achos",
  errorCaseNameInvalid: "Rhaid i enw maes enw'r achos gynnwys llythrennau, rhifau a thanlinellau yn unig"
};

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const listTypeId = Number.parseInt(req.params.listTypeId, 10);

  if (Number.isNaN(listTypeId)) {
    return res.status(400).send("Invalid list type ID");
  }

  const existingConfig = await service.getConfigForListType(listTypeId);

  res.render("list-search-config", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    body: lang.body,
    caseNumberFieldLabel: lang.caseNumberFieldLabel,
    caseNameFieldLabel: lang.caseNameFieldLabel,
    saveButton: lang.saveButton,
    errorSummaryTitle: lang.errorSummaryTitle,
    data: {
      caseNumberFieldName: existingConfig?.caseNumberFieldName || "",
      caseNameFieldName: existingConfig?.caseNameFieldName || ""
    },
    listTypeId
  });
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const listTypeId = Number.parseInt(req.params.listTypeId, 10);

  if (Number.isNaN(listTypeId)) {
    return res.status(400).send("Invalid list type ID");
  }

  const { caseNumberFieldName, caseNameFieldName } = req.body;

  const result = await service.saveConfig(listTypeId, caseNumberFieldName, caseNameFieldName);

  if (!result.success && result.errors) {
    const errors = result.errors.map((error) => ({
      text: error.message,
      href: `#${error.field.toLowerCase().replace(/\s+/g, "-")}`
    }));

    const fieldErrors: Record<string, { text: string }> = {};
    for (const error of result.errors) {
      const fieldId = error.field === "Case number field name" ? "caseNumberFieldName" : "caseNameFieldName";
      fieldErrors[fieldId] = { text: error.message };
    }

    return res.render("list-search-config", {
      pageTitle: lang.pageTitle,
      heading: lang.heading,
      body: lang.body,
      caseNumberFieldLabel: lang.caseNumberFieldLabel,
      caseNameFieldLabel: lang.caseNameFieldLabel,
      saveButton: lang.saveButton,
      errorSummaryTitle: lang.errorSummaryTitle,
      data: {
        caseNumberFieldName: caseNumberFieldName || "",
        caseNameFieldName: caseNameFieldName || ""
      },
      errors,
      fieldErrors,
      listTypeId
    });
  }

  const lng = req.query.lng === "cy" ? "?lng=cy" : "";
  res.redirect(`/system-admin/list-configuration${lng}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
