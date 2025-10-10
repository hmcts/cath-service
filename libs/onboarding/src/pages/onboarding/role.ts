import type { Request, Response } from "express";
import { processRoleSubmission, getSessionDataForPage } from "../../onboarding/service.js";
import { formatZodErrors, createErrorSummary } from "../../onboarding/validation.js";
import { getPreviousPage } from "../../onboarding/navigation.js";
import { ZodError } from "zod";

const en = {
  title: "What is your role?",
  heading: "What is your role?",
  options: {
    frontendDeveloper: "Frontend Developer",
    backendDeveloper: "Backend Developer",
    testEngineer: "Test Engineer",
    other: "Other"
  },
  otherLabel: "Please specify your role",
  back: "Back",
  continue: "Continue"
};

const cy = {
  title: "Beth yw eich rôl?",
  heading: "Beth yw eich rôl?",
  options: {
    frontendDeveloper: "Datblygwr Blaen",
    backendDeveloper: "Datblygwr Cefn",
    testEngineer: "Peiriannydd Prawf",
    other: "Arall"
  },
  otherLabel: "Nodwch eich rôl",
  back: "Yn ôl",
  continue: "Parhau"
};

export const GET = async (req: Request, res: Response) => {
  const data = getSessionDataForPage(req.session, "role");
  const backLink = getPreviousPage("role");

  res.render("onboarding/role", {
    data,
    backLink,
    en,
    cy
  });
};

export const POST = async (req: Request, res: Response) => {
  try {
    processRoleSubmission(req.session, req.body);

    // Always redirect to summary page (last page in flow)
    res.redirect("/onboarding/summary");
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = formatZodErrors(error);
      const errorSummary = createErrorSummary(errors);
      const backLink = getPreviousPage("role");

      res.render("onboarding/role", {
        errors,
        errorSummary,
        data: req.body,
        backLink,
        en,
        cy
      });
    } else {
      throw error;
    }
  }
};
