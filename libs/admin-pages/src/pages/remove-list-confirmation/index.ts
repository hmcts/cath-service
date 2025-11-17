import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { deleteArtefacts, getArtefactsByIds, mockListTypes } from "@hmcts/publication";
import type { Request, RequestHandler, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

function formatDateString(date: Date): string {
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const locale = req.query.lng === "cy" ? "cy" : "en";

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId || !sessionData.selectedArtefacts || sessionData.selectedArtefacts.length === 0) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  const artefacts = await getArtefactsByIds(sessionData.selectedArtefacts);

  const artefactData = artefacts.map((artefact) => {
    const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
    const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : String(artefact.listTypeId);

    const location = getLocationById(Number.parseInt(artefact.locationId, 10));
    const courtName = location ? (locale === "cy" ? location.welshName : location.name) : artefact.locationId;

    const displayDates = `${formatDateString(artefact.displayFrom)} to ${formatDateString(artefact.displayTo)}`;
    const language = capitalizeFirstLetter(artefact.language);
    const sensitivity = capitalizeFirstLetter(artefact.sensitivity);

    return {
      listType: listTypeName,
      court: courtName,
      contentDate: formatDateString(artefact.contentDate),
      displayDates,
      language,
      sensitivity
    };
  });

  res.render("remove-list-confirmation/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    tableHeaders: lang.tableHeaders,
    radioYes: lang.radioYes,
    radioNo: lang.radioNo,
    continueButton: lang.continueButton,
    artefactData,
    hideLanguageToggle: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const locale = req.query.lng === "cy" ? "cy" : "en";

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId || !sessionData.selectedArtefacts || sessionData.selectedArtefacts.length === 0) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  const confirmation = req.body.confirmation;

  if (!confirmation) {
    const artefacts = await getArtefactsByIds(sessionData.selectedArtefacts);
    const artefactData = artefacts.map((artefact) => {
      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
      const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : String(artefact.listTypeId);

      const location = getLocationById(Number.parseInt(artefact.locationId, 10));
      const courtName = location ? (locale === "cy" ? location.welshName : location.name) : artefact.locationId;

      const displayDates = `${formatDateString(artefact.displayFrom)} to ${formatDateString(artefact.displayTo)}`;
      const language = capitalizeFirstLetter(artefact.language);
      const sensitivity = capitalizeFirstLetter(artefact.sensitivity);

      return {
        listType: listTypeName,
        court: courtName,
        contentDate: formatDateString(artefact.contentDate),
        displayDates,
        language,
        sensitivity
      };
    });

    return res.render("remove-list-confirmation/index", {
      pageTitle: lang.pageTitle,
      heading: lang.heading,
      tableHeaders: lang.tableHeaders,
      radioYes: lang.radioYes,
      radioNo: lang.radioNo,
      continueButton: lang.continueButton,
      artefactData,
      errors: [
        {
          text: lang.errorNoSelection,
          href: "#confirmation"
        }
      ],
      errorSummaryTitle: lang.errorSummaryTitle,
      hideLanguageToggle: true
    });
  }

  if (confirmation === "no") {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search-results${lng}`);
  }

  try {
    await deleteArtefacts(sessionData.selectedArtefacts);

    delete req.session.removalData;
    req.session.removalSuccess = true;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    res.redirect(`/remove-list-success${lng}`);
  } catch (error) {
    console.error("Error deleting artefacts:", error);

    const artefacts = await getArtefactsByIds(sessionData.selectedArtefacts);
    const artefactData = artefacts.map((artefact) => {
      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
      const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : String(artefact.listTypeId);

      const location = getLocationById(Number.parseInt(artefact.locationId, 10));
      const courtName = location ? (locale === "cy" ? location.welshName : location.name) : artefact.locationId;

      const displayDates = `${formatDateString(artefact.displayFrom)} to ${formatDateString(artefact.displayTo)}`;
      const language = capitalizeFirstLetter(artefact.language);
      const sensitivity = capitalizeFirstLetter(artefact.sensitivity);

      return {
        listType: listTypeName,
        court: courtName,
        contentDate: formatDateString(artefact.contentDate),
        displayDates,
        language,
        sensitivity
      };
    });

    return res.render("remove-list-confirmation/index", {
      pageTitle: lang.pageTitle,
      heading: lang.heading,
      tableHeaders: lang.tableHeaders,
      radioYes: lang.radioYes,
      radioNo: lang.radioNo,
      continueButton: lang.continueButton,
      artefactData,
      errors: [
        {
          text: "An error occurred while removing content. Please try again later.",
          href: "#"
        }
      ],
      errorSummaryTitle: lang.errorSummaryTitle,
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
