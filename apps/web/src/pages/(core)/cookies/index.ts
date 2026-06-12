import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.redirect(301, "/cookie-preferences");
};

export const POST = async (_req: Request, res: Response) => {
  res.redirect(301, "/cookie-preferences");
};
