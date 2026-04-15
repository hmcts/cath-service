import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { deleteArtefacts, getArtefactsByIds } from "@hmcts/publication";
import { findAllListTypes } from "@hmcts/system-admin-pages";
import { sendThirdPartyDeletion } from "@hmcts/third-party-fulfilment";
import type { Request, RequestHandler, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

declare module "express-serve-static-core" {
  interface Request {
    auditMetadata?: {
      shouldLog?: boolean;
      action?: string;
      entityInfo?: string;
      [key: string]: string | number | boolean | undefined;
    };
  }
}

function formatDateString(date: Date): string {
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

async function transformArtefactsForDisplay(artefacts: Awaited<ReturnType<typeof getArtefactsByIds>>, locale: "en" | "cy") {
  // Fetch list types from database and create a map for quick lookup
  const listTypes = await findAllListTypes();
  const listTypeMap = new Map(listTypes.map((lt) => [lt.id, lt]));

  return Promise.all(
    artefacts.map(async (artefact) => {
      const listType = listTypeMap.get(artefact.listTypeId);
      let listTypeName = String(artefact.listTypeId);
      if (listType) {
        listTypeName = (locale === "cy" ? listType.welshFriendlyName : listType.friendlyName) || String(artefact.listTypeId);
      }

      const location = await getLocationById(Number.parseInt(artefact.locationId, 10));
      let courtName = artefact.locationId;
      if (location) {
        courtName = locale === "cy" ? location.welshName : location.name;
      }

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
    })
  );
}

async function renderConfirmationPage(
  res: Response,
  sessionData: NonNullable<Request["session"]["removalData"]>,
  lang: typeof en | typeof cy,
  locale: "en" | "cy",
  errors?: Array<{ text: string; href: string }>
) {
  const artefacts = await getArtefactsByIds(sessionData.selectedArtefacts);
  const artefactData = await transformArtefactsForDisplay(artefacts, locale);

  return res.render("remove-list-confirmation/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    tableHeaders: lang.tableHeaders,
    radioYes: lang.radioYes,
    radioNo: lang.radioNo,
    continueButton: lang.continueButton,
    artefactData,
    ...(errors && {
      errors,
      errorSummaryTitle: lang.errorSummaryTitle
    }),
    hideLanguageToggle: true
  });
}

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const locale = req.query.lng === "cy" ? "cy" : "en";

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId || !sessionData.selectedArtefacts || sessionData.selectedArtefacts.length === 0) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  return renderConfirmationPage(res, sessionData, lang, locale);
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
    return renderConfirmationPage(res, sessionData, lang, locale, [
      {
        text: lang.errorNoSelection,
        href: "#confirmation"
      }
    ]);
  }

  if (confirmation === "no") {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search-results${lng}`);
  }

  try {
    const artefactsToDelete = await getArtefactsByIds(sessionData.selectedArtefacts);

    await deleteArtefacts(sessionData.selectedArtefacts);

    for (const artefact of artefactsToDelete) {
      sendThirdPartyDeletion({
        artefactId: artefact.artefactId,
        locationId: artefact.locationId,
        listTypeId: artefact.listTypeId,
        contentDate: artefact.contentDate,
        sensitivity: artefact.sensitivity,
        language: artefact.language,
        displayFrom: artefact.displayFrom,
        displayTo: artefact.displayTo,
        provenance: artefact.provenance
      }).catch((error) => {
        console.error("Third-party deletion push failed:", error);
      });
    }

    delete req.session.removalData;
    req.session.removalSuccess = true;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get location name for audit log
    const location = await getLocationById(Number(sessionData.locationId));

    // Set audit log flag
    req.auditMetadata = {
      shouldLog: true,
      action: "REMOVE_LIST",
      entityInfo: `Court: ${location?.name || sessionData.locationId}, Artefacts removed: ${sessionData.selectedArtefacts.length}`
    };

    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    res.redirect(`/remove-list-success${lng}`);
  } catch (error) {
    console.error("Error deleting artefacts:", error);

    return renderConfirmationPage(res, sessionData, lang, locale, [
      {
        text: "An error occurred while removing content. Please try again later.",
        href: "#"
      }
    ]);
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
