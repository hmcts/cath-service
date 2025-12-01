import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  // Redirect to main handler with Welsh language parameter
  const savedParam = req.query.saved === "true" ? "&saved=true" : "";
  res.redirect(307, `/cookies-policy?lng=cy${savedParam}`);
};
