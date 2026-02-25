import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { createRegion } from "../../reference-data-upload/repository/region-repository.js";
import { validateRegionData } from "../../reference-data-upload/validation/region-validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  res.render("add-region/index", {
    ...content,
    data: {
      name: "",
      welshName: ""
    },
    errors: undefined
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const formData = {
    name: req.body.name || "",
    welshName: req.body.welshName || ""
  };

  // Validate the data
  const errors = await validateRegionData(formData);

  if (errors.length > 0) {
    return res.render("add-region/index", {
      ...content,
      data: formData,
      errors
    });
  }

  // Save to database
  try {
    await createRegion(formData.name, formData.welshName);

    // Store success message in session
    req.session.regionSuccess = {
      name: formData.name.trim(),
      welshName: formData.welshName.trim()
    };

    // Set audit log flag
    req.auditMetadata = {
      shouldLog: true,
      action: "ADD_REGION",
      entityInfo: `Name: ${formData.name.trim()}, Welsh Name: ${formData.welshName.trim()}`
    };

    // Redirect to success page
    res.redirect(`/add-region-success${language === "cy" ? "?lng=cy" : ""}`);
  } catch (error) {
    console.error("Error creating region:", error);
    return res.render("add-region/index", {
      ...content,
      data: formData,
      errors: [{ text: content.databaseError, href: "#name" }]
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
