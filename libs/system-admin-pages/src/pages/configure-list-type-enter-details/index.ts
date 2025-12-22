import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findListTypeById, findListTypeByName } from "../../list-type/queries.js";
import type { ListTypeFormData, ListTypeSession } from "../../list-type/types.js";
import { validateListTypeDetails } from "../../list-type/validation.js";
import * as cy from "./cy.js";
import * as en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const editId = req.query.id ? Number.parseInt(req.query.id as string, 10) : undefined;

  let formData: Partial<ListTypeFormData> = {};

  if (editId) {
    if (!session.configureListType?.editId || session.configureListType.editId !== editId) {
      const existingListType = await findListTypeById(editId);
      if (existingListType) {
        formData = {
          name: existingListType.name,
          friendlyName: existingListType.friendlyName || "",
          welshFriendlyName: existingListType.welshFriendlyName || "",
          shortenedFriendlyName: existingListType.shortenedFriendlyName || "",
          url: existingListType.url || "",
          defaultSensitivity: existingListType.defaultSensitivity || "",
          allowedProvenance: existingListType.allowedProvenance.split(","),
          isNonStrategic: existingListType.isNonStrategic,
          subJurisdictionIds: existingListType.subJurisdictions.map((sj) => sj.subJurisdictionId),
          editId
        };
        session.configureListType = formData;
      }
    } else {
      formData = session.configureListType;
    }
  } else {
    delete session.configureListType;
    formData = {};
  }

  const checkedProvenance = {
    CFT_IDAM: formData.allowedProvenance?.includes("CFT_IDAM") || false,
    B2C: formData.allowedProvenance?.includes("B2C") || false,
    COMMON_PLATFORM: formData.allowedProvenance?.includes("COMMON_PLATFORM") || false
  };

  res.render("configure-list-type-enter-details/index", {
    ...content,
    data: formData,
    checkedProvenance,
    isEdit: !!editId
  });
};

const postHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const allowedProvenance = Array.isArray(req.body.allowedProvenance)
    ? req.body.allowedProvenance
    : req.body.allowedProvenance
      ? [req.body.allowedProvenance]
      : [];

  const formData = {
    name: req.body.name || "",
    friendlyName: req.body.friendlyName || "",
    welshFriendlyName: req.body.welshFriendlyName || "",
    shortenedFriendlyName: req.body.shortenedFriendlyName || "",
    url: req.body.url || "",
    defaultSensitivity: req.body.defaultSensitivity || "",
    allowedProvenance,
    isNonStrategic: req.body.isNonStrategic === "true"
  };

  const errors = validateListTypeDetails(formData);

  const existingListType = await findListTypeByName(formData.name);
  if (existingListType && existingListType.id !== session.configureListType?.editId) {
    const duplicateMessage = language === "cy" ? "Mae math o restr gyda'r enw hwn eisoes yn bodoli" : "A list type with this name already exists";
    errors.push({
      field: "name",
      message: duplicateMessage,
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
      CFT_IDAM: formData.allowedProvenance?.includes("CFT_IDAM") || false,
      B2C: formData.allowedProvenance?.includes("B2C") || false,
      COMMON_PLATFORM: formData.allowedProvenance?.includes("COMMON_PLATFORM") || false
    };

    return res.render("configure-list-type-enter-details/index", {
      ...content,
      data: formData,
      checkedProvenance,
      errors: errorMap,
      errorList: errors.map((error) => ({
        text: error.message,
        href: error.href
      })),
      isEdit: !!session.configureListType?.editId
    });
  }

  session.configureListType = {
    ...formData,
    subJurisdictionIds: session.configureListType?.subJurisdictionIds || [],
    editId: session.configureListType?.editId
  };

  res.redirect("/configure-list-type-select-sub-jurisdictions");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
