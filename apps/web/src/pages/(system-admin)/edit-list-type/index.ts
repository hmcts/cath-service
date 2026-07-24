import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { ListTypeFormData, ListTypeSession } from "@hmcts/system-admin-pages";
import { findListTypeById, findListTypeByName, validateListTypeDetails } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;
  const language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;

  const rawId = req.query.id as string;
  const id = Number.parseInt(rawId, 10);

  if (!rawId || Number.isNaN(id)) {
    return res.status(400).render("errors/common", { status: 400 });
  }

  let formData: Partial<ListTypeFormData> = {};

  if (session.configureListType?.editId === id) {
    formData = session.configureListType;
  } else {
    const existingListType = await findListTypeById(id);
    if (!existingListType) {
      return res.status(404).render("errors/common", { status: 404 });
    }

    formData = {
      name: existingListType.name,
      friendlyName: existingListType.friendlyName || "",
      welshFriendlyName: existingListType.welshFriendlyName || "",
      shortenedFriendlyName: existingListType.shortenedFriendlyName || "",
      url: existingListType.url || "",
      caseNumberJsonFieldName: existingListType.caseNumberJsonFieldName || null,
      caseNameJsonFieldName: existingListType.caseNameJsonFieldName || null,
      defaultSensitivity: existingListType.defaultSensitivity || "",
      allowedProvenance: existingListType.allowedProvenance.split(","),
      isNonStrategic: existingListType.isNonStrategic,
      subJurisdictionIds: existingListType.subJurisdictions.map((sj) => sj.subJurisdiction.subJurisdictionId),
      editId: id
    };
    session.configureListType = formData;
  }

  const checkedProvenance = {
    CFT_IDAM: formData.allowedProvenance?.includes("CFT_IDAM") || false,
    PI_AAD: formData.allowedProvenance?.includes("PI_AAD") || false,
    CRIME_IDAM: formData.allowedProvenance?.includes("CRIME_IDAM") || false
  };

  res.render("edit-list-type/index", {
    t,
    data: formData,
    checkedProvenance
  });
};

const postHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;
  const language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;

  const rawId = req.query.id as string;
  const id = Number.parseInt(rawId, 10);

  if (!rawId || Number.isNaN(id)) {
    return res.status(400).render("errors/common", { status: 400 });
  }

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
  if (existingListType && existingListType.id !== id) {
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

    return res.render("edit-list-type/index", {
      t,
      data: formData,
      checkedProvenance,
      errors: errorMap,
      errorList: errors.map((error) => ({ text: error.message, href: error.href }))
    });
  }

  const existingSubJurisdictionIds = session.configureListType?.subJurisdictionIds;
  let subJurisdictionIds: number[];

  if (existingSubJurisdictionIds !== undefined) {
    subJurisdictionIds = existingSubJurisdictionIds;
  } else {
    const existing = await findListTypeById(id);
    subJurisdictionIds = existing ? existing.subJurisdictions.map((sj) => sj.subJurisdiction.subJurisdictionId) : [];
  }

  session.configureListType = {
    ...formData,
    subJurisdictionIds,
    editId: id
  };

  res.redirect("/configure-list-type-select-sub-jurisdictions");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
