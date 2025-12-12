import type { Request, Response } from "express";
import { getLatestSjpLists } from "../../sjp-service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const lists = await getLatestSjpLists();

  const publicLists = lists.filter((l) => l.listType === "public");
  const pressLists = lists.filter((l) => l.listType === "press");

  res.render("sjp-selection/index", {
    en,
    cy,
    locale,
    publicLists,
    pressLists
  });
};
