import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { createJurisdiction } from "../../reference-data-upload/repository/jurisdiction-repository.js";
import { validateJurisdictionData } from "../../reference-data-upload/validation/jurisdiction-validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (req: Request, res: Response) => {
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

export const postHandler = async (req: Request, res: Response) => {
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
  try {
    await createJurisdiction(formData.name, formData.welshName);

    // Store success message in session
    req.session.jurisdictionSuccess = {
      name: formData.name.trim(),
      welshName: formData.welshName.trim()
    };

    // Save session before redirect to avoid race conditions
    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Redirect to success page
    res.redirect(`/add-jurisdiction-success${language === "cy" ? "?lng=cy" : ""}`);
  } catch (error) {
    console.error("Error creating jurisdiction:", error);
    return res.render("add-jurisdiction/index", {
      ...content,
      data: formData,
      errors: [{ text: content.databaseError, href: "#name" }]
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
