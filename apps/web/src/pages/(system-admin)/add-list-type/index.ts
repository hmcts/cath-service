import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { ListTypeFormData, ListTypeSession } from "@hmcts/system-admin-pages";
import { findListTypeByName, validateListTypeDetails } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;
  const language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;

  delete session.configureListType;

  res.render("add-list-type/index", {
    t,
    data: {},
    checkedProvenance: { CFT_IDAM: false, PI_AAD: false, CRIME_IDAM: false }
  });
};

const postHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;
  const language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;

  let allowedProvenance: string[] = [];
  if (Array.isArray(req.body.allowedProvenance)) {
    allowedProvenance = req.body.allowedProvenance;
  } else if (req.body.allowedProvenance) {
    allowedProvenance = [req.body.allowedProvenance];
  }

  const isNonStrategic = req.body.isNonStrategic === "true" ? true : req.body.isNonStrategic === "false" ? false : null;

  const formData: Partial<ListTypeFormData> = {
    name: req.body.name || "",
    friendlyName: req.body.friendlyName || "",
    welshFriendlyName: req.body.welshFriendlyName || "",
    shortenedFriendlyName: req.body.shortenedFriendlyName || "",
    url: req.body.url || "",
    caseNumberJsonFieldName: req.body.caseNumberJsonFieldName || null,
    caseNameJsonFieldName: req.body.caseNameJsonFieldName || null,
    defaultSensitivity: req.body.defaultSensitivity || "",
    allowedProvenance,
    isNonStrategic
  };

  const errors = validateListTypeDetails({
    name: formData.name!,
    friendlyName: formData.friendlyName!,
    welshFriendlyName: formData.welshFriendlyName!,
    shortenedFriendlyName: formData.shortenedFriendlyName!,
    url: formData.url!,
    caseNumberJsonFieldName: formData.caseNumberJsonFieldName,
    caseNameJsonFieldName: formData.caseNameJsonFieldName,
    defaultSensitivity: formData.defaultSensitivity!,
    allowedProvenance: formData.allowedProvenance!,
    isNonStrategic: formData.isNonStrategic
  });

  const existingListType = await findListTypeByName(formData.name!);
  if (existingListType) {
    errors.push({
      field: "name",
      message: t.duplicateNameError,
      href: "#name"
    });
  }

  if (errors.length > 0) {
    const errorMap = errors.reduce(
      (acc, error) => {
        acc[error.field] = { text: error.message };
        return acc;
      },
      {} as Record<string, { text: string }>
    );

    const checkedProvenance = {
      CFT_IDAM: allowedProvenance.includes("CFT_IDAM"),
      PI_AAD: allowedProvenance.includes("PI_AAD"),
      CRIME_IDAM: allowedProvenance.includes("CRIME_IDAM")
    };

    return res.render("add-list-type/index", {
      t,
      data: formData,
      checkedProvenance,
      errors: errorMap,
      errorList: errors.map((error) => ({ text: error.message, href: error.href }))
    });
  }

  session.configureListType = {
    ...formData,
    subJurisdictionIds: [],
    editId: undefined
  };

  res.redirect("/configure-list-type-select-sub-jurisdictions");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
