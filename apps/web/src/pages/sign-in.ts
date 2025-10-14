import type { Request, Response } from "express";

const en = {
  title: "Sign in"
};

const cy = {
  title: "Mewngofnodi"
};

export const GET = async (_req: Request, res: Response) => {
  res.render("sign-in", { en, cy });
};
