import type { Request, Response } from "express";
import { createJurisdiction } from "../../reference-data-upload/repository/jurisdiction-repository.js";
import { validateJurisdictionData } from "../../reference-data-upload/validation/jurisdiction-validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  res.render("add-jurisdiction/index", {
    ...content,
    data: {
      name: "",
      welshName: ""
    },
    errors: undefined
  });
};

export const POST = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const formData = {
    name: req.body.name || "",
    welshName: req.body.welshName || ""
  };

  // Validate the data
  const errors = await validateJurisdictionData(formData);

  if (errors.length > 0) {
    return res.render("add-jurisdiction/index", {
      ...content,
      data: formData,
      errors
    });
  }

  // Save to database
  await createJurisdiction(formData.name, formData.welshName);

  // Store success message in session
  req.session.jurisdictionSuccess = {
    name: formData.name.trim(),
    welshName: formData.welshName.trim()
  };

  // Redirect to success page
  res.redirect(`/add-jurisdiction-success${language === "cy" ? "?lng=cy" : ""}`);
};
