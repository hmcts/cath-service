import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.status(400).render("errors/400");
};
