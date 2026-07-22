import type { Artefact } from "@hmcts/publication";
import { canAccessPublicationData, getArtefactById, getPublicationJson, listTypeHasExcel, PROVENANCE_LABELS, resolveListType } from "@hmcts/publication";
import type { Request, Response } from "express";

export type ValidationResult = { isValid: boolean; errors: unknown[] };

type LocaleContent = {
  errorTitle: string;
  errorMessage: string;
  error403Title?: string;
  error403Message?: string;
  [key: string]: unknown;
};

type RenderCallback<T> = (params: { artefact: Artefact; jsonData: T; locale: string; res: Response }) => Promise<void> | void;

type HandlerOptions<T> = {
  en: LocaleContent;
  cy: LocaleContent;
  validate: (data: unknown) => ValidationResult;
  logPrefix: string;
  render: RenderCallback<T>;
  checkAccess?: boolean;
};

function renderError(res: Response, status: number, template: string, extras: object) {
  return res.status(status).render(template, extras);
}

export function createListTypeHandler<T>(options: HandlerOptions<T>) {
  const { en, cy, validate, logPrefix, render, checkAccess = false } = options;

  return async (req: Request, res: Response) => {
    const locale = res.locals.locale || "en";
    const t = locale === "cy" ? cy : en;
    const artefactId = req.query.artefactId as string;

    if (!artefactId) return renderError(res, 400, "errors/common", { en, cy, errorTitle: t.errorTitle, errorMessage: t.errorMessage });

    try {
      const artefact = await getArtefactById(artefactId);
      if (!artefact) return renderError(res, 404, "errors/common", { en, cy, errorTitle: t.errorTitle, errorMessage: t.errorMessage });

      if (checkAccess && !canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))) {
        return renderError(res, 403, "errors/403", {
          en: { title: en.error403Title, message: en.error403Message },
          cy: { title: cy.error403Title, message: cy.error403Message }
        });
      }

      const jsonData = await getPublicationJson(artefactId);
      if (!jsonData) {
        console.error(`[${logPrefix}] Blob not found for artefactId: ${artefactId}`);
        return renderError(res, 404, "errors/common", { en, cy, errorTitle: t.errorTitle, errorMessage: t.errorMessage });
      }

      const validationResult = validate(jsonData);
      if (!validationResult.isValid) {
        console.error(`[${logPrefix}] Validation errors:`, validationResult.errors);
        return renderError(res, 400, "errors/common", { en, cy, errorTitle: t.errorTitle, errorMessage: t.errorMessage });
      }

      await render({ artefact, jsonData: jsonData as T, locale, res });
    } catch (error) {
      console.error(`[${logPrefix}] Unexpected error:`, error);
      return renderError(res, 500, "errors/common", { en, cy, errorTitle: t.errorTitle, errorMessage: t.errorMessage });
    }
  };
}

type SimpleLocaleContent = {
  error403Title?: string;
  error403Message?: string;
  [key: string]: unknown;
};

type SimpleHandlerOptions<T> = {
  en: SimpleLocaleContent;
  cy: SimpleLocaleContent;
  validate: (data: unknown) => ValidationResult;
  logPrefix: string;
  guardArtefact?: (artefact: Artefact, res: Response) => boolean;
  serverError?: { errorTitle: string; errorMessage: string };
  render: RenderCallback<T>;
};

const BAD_REQUEST_ERRORS = {
  errorTitle: "Bad Request",
  errorMessage: "Missing artefactId parameter"
};

const NOT_FOUND_ERRORS = {
  errorTitle: "Not Found",
  errorMessage: "The requested list could not be found"
};

const INVALID_DATA_ERRORS = {
  errorTitle: "Invalid Data",
  errorMessage: "The list data is invalid"
};

const DEFAULT_SERVER_ERROR = {
  errorTitle: "Error",
  errorMessage: "An error occurred while displaying the list"
};

export function createSimpleListTypeHandler<T>(options: SimpleHandlerOptions<T>) {
  const { en, cy, validate, logPrefix, guardArtefact, serverError = DEFAULT_SERVER_ERROR, render } = options;

  return async (req: Request, res: Response) => {
    const locale = res.locals.locale || "en";
    const artefactId = typeof req.query.artefactId === "string" ? req.query.artefactId : undefined;

    if (!artefactId) {
      return res.status(400).render("errors/common", { en, cy, ...BAD_REQUEST_ERRORS });
    }

    try {
      const artefact = await getArtefactById(artefactId);

      if (!artefact) {
        return res.status(404).render("errors/common", { en, cy, ...NOT_FOUND_ERRORS });
      }

      if (!canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))) {
        res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
        return res.status(403).render("errors/403", {
          en: {
            title: (en.error403Title as string | undefined) ?? "Access denied",
            message: (en.error403Message as string | undefined) ?? "You do not have permission to view this publication."
          },
          cy: {
            title: (cy.error403Title as string | undefined) ?? "Mynediad wedi'i wrthod",
            message: (cy.error403Message as string | undefined) ?? "Nid oes gennych ganiatâd i weld y cyhoeddiad hwn."
          }
        });
      }

      if (guardArtefact) {
        const guardResult = guardArtefact(artefact, res);
        if (guardResult) return guardResult;
      }

      const jsonData = await getPublicationJson(artefactId);
      if (!jsonData) {
        console.error(`[${logPrefix}] Blob not found for artefactId: ${artefactId}`);
        return res.status(404).render("errors/common", { en, cy, ...NOT_FOUND_ERRORS });
      }

      const validationResult = validate(jsonData);
      if (!validationResult.isValid) {
        console.error(`[${logPrefix}] Validation errors:`, validationResult.errors);
        return res.status(400).render("errors/common", { en, cy, ...INVALID_DATA_ERRORS });
      }

      await render({ artefact, jsonData: jsonData as T, locale, res });
    } catch (error) {
      console.error(`[${logPrefix}] Unexpected error:`, error);
      return res.status(500).render("errors/common", { en, cy, ...serverError });
    }
  };
}

export function resolveDataSource(provenance: string, t?: { provenanceLabels?: Record<string, string> }): string {
  return t?.provenanceLabels?.[provenance] ?? PROVENANCE_LABELS[provenance] ?? provenance;
}

type WeeklyHearingListRenderFn<T> = (
  data: T,
  params: { locale: string; courtName: string; contentDate: Date; lastReceivedDate: string; listTitle: string }
) => { header: { listTitle: string }; hearings: unknown };

export function createWeeklyHearingListRender<T>(
  renderFn: WeeklyHearingListRenderFn<T>,
  courtName: string,
  template: string,
  en: SimpleLocaleContent,
  cy: SimpleLocaleContent
): RenderCallback<T> {
  return ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderFn(jsonData, {
      locale,
      courtName,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle as string
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render(template, { en, cy, t, pageTitle: header.listTitle, header, hearings, dataSource });
  };
}

export const LIST_LOAD_SERVER_ERROR = {
  errorTitle: "Server Error",
  errorMessage: "An error occurred while loading the list"
} as const;

const UTIAC_COURT_NAME = "Upper Tribunal (Immigration and Asylum) Chamber";

export function createUtiacDailyRender<T>(
  renderFn: WeeklyHearingListRenderFn<T>,
  template: string,
  en: SimpleLocaleContent,
  cy: SimpleLocaleContent
): RenderCallback<T> {
  return createWeeklyHearingListRender(renderFn, UTIAC_COURT_NAME, template, en, cy);
}

export function createUtiacJrRegionalDailyRender<T>(
  renderFn: WeeklyHearingListRenderFn<T>,
  en: SimpleLocaleContent,
  cy: SimpleLocaleContent
): RenderCallback<T> {
  return createWeeklyHearingListRender(renderFn, UTIAC_COURT_NAME, "utiac-jr-daily-hearing-list", en, cy);
}

export type ListTypeConfig = Record<string, { en: string; cy: string; template: string }>;

type CauseListRenderFn<T> = (
  data: T,
  params: { locationId: string; contentDate: Date; locale: string }
) => Promise<{ header: unknown; openJustice: unknown; listData: unknown }>;

export function createCauseListRender<T>(renderFn: CauseListRenderFn<T>, template: string, en: LocaleContent, cy: LocaleContent): RenderCallback<T> {
  return async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, listData } = await renderFn(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    const artefactId = artefact.artefactId;
    const pdfDownloadUrl = `/api/flat-file/${artefactId}/download`;
    const excelDownloadUrl = listTypeHasExcel(artefact.listTypeName) ? `/api/flat-file/${artefactId}/download?format=excel` : undefined;
    res.render(template, { en, cy, pageTitle: t.title, header, openJustice, listData, dataSource, t, artefactId, pdfDownloadUrl, excelDownloadUrl });
  };
}

type MultiListRenderFn<T> = (
  jsonData: T,
  params: { locale: string; listTypeName: string; listTitle: string; contentDate: Date; lastReceivedDate: string }
) => { header: { listTitle: string }; hearings: unknown };

type MultiListHandlerOptions<T> = {
  en: SimpleLocaleContent;
  cy: SimpleLocaleContent;
  listTypeConfig: ListTypeConfig;
  renderFn: MultiListRenderFn<T>;
  resolveTemplate: (listConfig: { en: string; cy: string; template: string }) => string;
};

export function createMultiListGuardAndRender<T>(opts: MultiListHandlerOptions<T>) {
  const { en, cy, listTypeConfig, renderFn, resolveTemplate } = opts;

  const guardArtefact = (artefact: Artefact, res: Response): boolean => {
    if (!artefact.listTypeName || !listTypeConfig[artefact.listTypeName]) {
      res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
      return true;
    }
    return false;
  };

  const render = ({ artefact, jsonData, locale, res }: { artefact: Artefact; jsonData: T; locale: string; res: Response }): void => {
    const t = locale === "cy" ? cy : en;
    const listTypeName = artefact.listTypeName ?? "";
    const listConfig = listTypeConfig[listTypeName];
    const listTitle = listConfig[locale as "en" | "cy"];

    const { header, hearings } = renderFn(jsonData, {
      locale,
      listTypeName,
      listTitle,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });

    const dataSource = (t as any).common?.provenanceLabels?.[artefact.provenance] || PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    const listContent = (t as any)[listTypeName] || {};

    res.render(resolveTemplate(listConfig), {
      en,
      cy,
      t,
      pageTitle: header.listTitle,
      header,
      hearings,
      dataSource,
      listTypeName,
      listContent,
      common: (t as any).common
    });
  };

  return { guardArtefact, render };
}
