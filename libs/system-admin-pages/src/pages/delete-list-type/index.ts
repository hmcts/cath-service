import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findListTypeById, hasArtefactsForListType, softDeleteListType } from "../../list-type/queries.js";
import * as cy from "./cy.js";
import * as en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const id = Number.parseInt(req.query.id as string, 10);

  if (!id || Number.isNaN(id)) {
    return res.status(400).render("delete-list-type/index", {
      ...content,
      errors: [{ text: content.errorListTypeNotFound, href: "#confirmDelete" }],
      data: {}
    });
  }

  const listType = await findListTypeById(id);

  if (!listType) {
    return res.status(404).render("delete-list-type/index", {
      ...content,
      errors: [{ text: content.errorListTypeNotFound, href: "#confirmDelete" }],
      data: {}
    });
  }

  res.render("delete-list-type/index", {
    ...content,
    listTypeName: listType.friendlyName || listType.name,
    data: {}
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const id = Number.parseInt(req.query.id as string, 10);
  const confirmDelete = req.body.confirmDelete;

  if (!id || Number.isNaN(id)) {
    return res.status(400).render("delete-list-type/index", {
      ...content,
      errors: [{ text: content.errorListTypeNotFound, href: "#confirmDelete" }],
      data: { confirmDelete }
    });
  }

  const listType = await findListTypeById(id);

  if (!listType) {
    return res.status(404).render("delete-list-type/index", {
      ...content,
      errors: [{ text: content.errorListTypeNotFound, href: "#confirmDelete" }],
      data: { confirmDelete }
    });
  }

  // Validation: check if user selected an option
  if (!confirmDelete) {
    return res.render("delete-list-type/index", {
      ...content,
      listTypeName: listType.friendlyName || listType.name,
      errors: [{ text: content.errorConfirmationRequired, href: "#confirmDelete" }],
      data: { confirmDelete }
    });
  }

  // If user selected "no", redirect back to view list types
  if (confirmDelete === "no") {
    return res.redirect("/view-list-types");
  }

  // If user selected "yes", check for artifacts
  const hasArtefacts = await hasArtefactsForListType(id);

  if (hasArtefacts) {
    return res.render("delete-list-type/index", {
      ...content,
      listTypeName: listType.friendlyName || listType.name,
      errors: [{ text: content.errorCannotDelete, href: "#confirmDelete" }],
      data: { confirmDelete }
    });
  }

  // Perform soft delete
  await softDeleteListType(id);

  // Redirect to success page
  const lng = req.query.lng === "cy" ? "?lng=cy" : "";
  res.redirect(`/delete-list-type-success${lng}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
