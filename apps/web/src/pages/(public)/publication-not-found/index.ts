import type { Request, Response } from "express";

const en = {
  pageTitle: "Page not found",
  heading: "Page not found",
  bodyText: "You have attempted to view a page that no longer exists. This could be because the publication you are trying to view has expired.",
  buttonText: "Find a court or tribunal"
};

const cy = {
  pageTitle: "Ni chanfuwyd y dudalen",
  heading: "Ni chanfuwyd y dudalen",
  bodyText: "Rydych chi wedi ceisio gweld tudalen nad yw'n bodoli mwyach. Gallai hyn fod oherwydd bod y cyhoeddiad rydych chi'n ceisio'i weld wedi dod i ben.",
  buttonText: "Dod o hyd i lys neu dribiwnlys"
};

export const GET = async (_req: Request, res: Response) => {
  res.status(404).render("publication-not-found", { en, cy });
};
