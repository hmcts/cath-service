import type { Request, Response } from "express";

const en = {
  title: "Sign in - SSO Rejected Login - Court and Tribunal Hearings - GOV.UK",
  header: "SSO Rejected Login",
  paragraph1:
    "Unfortunately, you do not have an account for the Court and tribunal hearings service admin dashboard. To create an account please use the link below:",
  linkText: "ServiceNow"
};

const cy = {
  title: "Mewngofnodi - Mewngofnodiad SSO wedi'i Wrthod - Gwrandawiadau Llys a Thribiwnlys - GOV.UK",
  header: "Mewngofnodiad SSO wedi'i Wrthod",
  paragraph1:
    "Yn anffodus, nid oes gennych gyfrif ar gyfer dangosfwrdd gweinyddol y gwasanaeth gwrandawiadau llys a thribiwnlys. I greu cyfrif, defnyddiwch y ddolen isod:",
  linkText: "ServiceNow"
};

export const GET = async (_req: Request, res: Response) => {
  res.render("sso/rejected", { en, cy });
};
