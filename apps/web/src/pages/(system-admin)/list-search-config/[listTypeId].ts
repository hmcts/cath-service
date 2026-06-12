import { requireRole, USER_ROLES } from "@hmcts/auth";
import * as service from "@hmcts/list-search-config";
import { getParamAsNumber } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const listTypeId = getParamAsNumber(req.params, "listTypeId");

  if (Number.isNaN(listTypeId)) {
    return res.status(400).send("Invalid list type ID");
  }

  const existingConfig = await service.getConfigForListType(listTypeId);

  res.render("list-search-config/index", {
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
  const listTypeId = getParamAsNumber(req.params, "listTypeId");

  if (Number.isNaN(listTypeId)) {
    return res.status(400).send("Invalid list type ID");
  }

  const { caseNumberFieldName, caseNameFieldName } = req.body;

  const result = await service.saveConfig(listTypeId, caseNumberFieldName, caseNameFieldName);

  if (!result.success && result.errors) {
    const errors = result.errors.map((error) => ({
      text: error.message,
      href: error.field ? `#${error.field.toLowerCase().replace(/\s+/g, "-")}` : undefined
    }));

    const fieldErrors: Record<string, { text: string }> = {};
    for (const error of result.errors) {
      if (error.field === "Case number field name") {
        fieldErrors.caseNumberFieldName = { text: error.message };
      } else if (error.field === "Case name field name") {
        fieldErrors.caseNameFieldName = { text: error.message };
      }
    }

    return res.render("list-search-config/index", {
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
  res.redirect(`/list-search-config-success${lng}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
