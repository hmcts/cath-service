import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";

const en = {
  pageTitle: "List type search configuration updated",
  heading: "List type search configuration updated",
  body: "What do you want to do next?",
  returnLink: "Manage list types"
};

const cy = {
  pageTitle: "Ffurfweddiad chwilio math rhestr wedi'i ddiweddaru",
  heading: "Ffurfweddiad chwilio math rhestr wedi'i ddiweddaru",
  body: "Beth hoffech chi ei wneud nesaf?",
  returnLink: "Rheoli mathau rhestr"
};

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;

  res.render("list-search-config-success", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    body: lang.body,
    returnLink: lang.returnLink
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
