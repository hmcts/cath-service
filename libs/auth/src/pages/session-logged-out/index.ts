import type { Request, Response } from "express";
import { en } from "./en.js";
import { cy } from "./cy.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("session-logged-out/index", { en, cy });
};
