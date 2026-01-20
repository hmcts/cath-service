import { requireRole, USER_ROLES } from "@hmcts/auth";
import { mockListTypes } from "@hmcts/list-types-common";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const listTypes = mockListTypes
    .map((listType) => ({
      id: listType.id,
      name: listType.englishFriendlyName,
      configureUrl: `/list-search-config/${listType.id}`
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.render("manage-list-types/index", {
    ...content,
    listTypes
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
