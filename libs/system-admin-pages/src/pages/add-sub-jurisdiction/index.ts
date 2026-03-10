import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { createSubJurisdiction, getAllJurisdictions, type JurisdictionOption } from "../../reference-data-upload/repository/sub-jurisdiction-repository.js";
import { validateSubJurisdictionData } from "../../reference-data-upload/validation/sub-jurisdiction-validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  // Fetch all jurisdictions for dropdown
  const jurisdictions = await getAllJurisdictions();

  // Build dropdown items
  const jurisdictionItems = [
    { value: "", text: content.jurisdictionPlaceholder },
    ...jurisdictions.map((j: JurisdictionOption) => ({
      value: j.jurisdictionId.toString(),
      text: j.displayName
    }))
  ];

  res.render("add-sub-jurisdiction/index", {
    ...content,
    jurisdictionItems,
    data: {
      jurisdictionId: "",
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
    jurisdictionId: req.body.jurisdictionId || "",
    name: req.body.name || "",
    welshName: req.body.welshName || ""
  };

  // Validate the data
  const errors = await validateSubJurisdictionData(formData);

  if (errors.length > 0) {
    // Fetch jurisdictions again for dropdown
    const jurisdictions = await getAllJurisdictions();

    // Build dropdown items
    const jurisdictionItems = [
      { value: "", text: "Select a jurisdiction" },
      ...jurisdictions.map((j: JurisdictionOption) => ({
        value: j.jurisdictionId.toString(),
        text: j.displayName
      }))
    ];

    return res.render("add-sub-jurisdiction/index", {
      ...content,
      jurisdictionItems,
      data: formData,
      errors
    });
  }

  // Save to database
  const jurisdictionIdNum = Number.parseInt(formData.jurisdictionId, 10);
  await createSubJurisdiction(jurisdictionIdNum, formData.name, formData.welshName);

  // Store success flag in session
  req.session.subJurisdictionSuccess = true;

  // Set audit log flag
  req.auditMetadata = {
    shouldLog: true,
    action: "ADD_SUB_JURISDICTION",
    entityInfo: `Name: ${formData.name.trim()}, Welsh Name: ${formData.welshName.trim()}, Jurisdiction ID: ${jurisdictionIdNum}`
  };

  // Redirect to success page
  res.redirect(`/add-sub-jurisdiction-success${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
