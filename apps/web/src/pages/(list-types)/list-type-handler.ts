import { prisma } from "@hmcts/postgres-prisma";
import type { Artefact } from "@hmcts/publication";
import { canAccessPublicationData, getArtefactById, getPublicationJson, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
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

export function createListTypeHandler<T>(options: HandlerOptions<T>) {
  const { en, cy, validate, logPrefix, render, checkAccess = false } = options;

  return async (req: Request, res: Response) => {
    const locale = res.locals.locale || "en";
    const t = locale === "cy" ? cy : en;

    const artefactId = req.query.artefactId as string;

    if (!artefactId) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    try {
      const artefact = await getArtefactById(artefactId);

      if (!artefact) {
        return res.status(404).render("errors/common", {
          en,
          cy,
          errorTitle: t.errorTitle,
          errorMessage: t.errorMessage
        });
      }

      if (checkAccess) {
        const dbListType = await prisma.listType.findUnique({
          where: { id: artefact.listTypeId }
        });

        const listType: ListType | undefined = dbListType
          ? {
              id: dbListType.id,
              provenance: dbListType.allowedProvenance,
              isNonStrategic: dbListType.isNonStrategic
            }
          : undefined;

        const canAccess = canAccessPublicationData(req.user, artefact, listType);

        if (!canAccess) {
          return res.status(403).render("errors/403", {
            en: {
              title: en.error403Title,
              message: en.error403Message
            },
            cy: {
              title: cy.error403Title,
              message: cy.error403Message
            }
          });
        }
      }

      const jsonData = await getPublicationJson(artefactId);
      if (!jsonData) {
        console.error(`[${logPrefix}] Blob not found for artefactId: ${artefactId}`);
        return res.status(404).render("errors/common", {
          en,
          cy,
          errorTitle: t.errorTitle,
          errorMessage: t.errorMessage
        });
      }

      const validationResult = validate(jsonData);
      if (!validationResult.isValid) {
        console.error(`[${logPrefix}] Validation errors:`, validationResult.errors);
        return res.status(400).render("errors/common", {
          en,
          cy,
          errorTitle: t.errorTitle,
          errorMessage: t.errorMessage
        });
      }

      await render({ artefact, jsonData: jsonData as T, locale, res });
    } catch (error) {
      console.error(`[${logPrefix}] Unexpected error:`, error);
      return res.status(500).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }
  };
}

type SimpleLocaleContent = {
  [key: string]: unknown;
};

type SimpleRenderCallback<T> = (params: { artefact: Artefact; jsonData: T; locale: string; res: Response }) => Promise<void> | void;

type SimpleHandlerOptions<T> = {
  en: SimpleLocaleContent;
  cy: SimpleLocaleContent;
  validate: (data: unknown) => ValidationResult;
  logPrefix: string;
  guardArtefact?: (artefact: Artefact, res: Response) => boolean;
  serverError?: { errorTitle: string; errorMessage: string };
  render: SimpleRenderCallback<T>;
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
): SimpleRenderCallback<T> {
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
    res.render(template, { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  };
}

export const LIST_LOAD_SERVER_ERROR = {
  errorTitle: "Server Error",
  errorMessage: "An error occurred while loading the list"
} as const;

type UtiacDailyRenderFn<T> = (
  data: T,
  params: { locale: string; courtName: string; displayFrom: Date; lastReceivedDate: string; listTitle: string }
) => { header: { listTitle: string }; hearings: unknown };

export function createUtiacDailyRender<T>(
  renderFn: UtiacDailyRenderFn<T>,
  template: string,
  en: SimpleLocaleContent,
  cy: SimpleLocaleContent
): SimpleRenderCallback<T> {
  return ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderFn(jsonData, {
      locale,
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: artefact.displayFrom,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle as string
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render(template, { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  };
}

export function createUtiacJrRegionalDailyRender<T>(
  renderFn: UtiacDailyRenderFn<T>,
  en: SimpleLocaleContent,
  cy: SimpleLocaleContent
): SimpleRenderCallback<T> {
  return createUtiacDailyRender(renderFn, "utiac-jr-daily-hearing-list", en, cy);
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
    res.render(template, { en, cy, title: t.title, header, openJustice, listData, dataSource, t });
  };
}

type MultiListRenderFn<T> = (
  jsonData: T,
  params: { locale: string; listTypeId: number; listTitle: string; contentDate: Date; lastReceivedDate: string }
) => { header: { listTitle: string }; hearings: unknown };

type MultiListHandlerOptions<T> = {
  en: SimpleLocaleContent;
  cy: SimpleLocaleContent;
  listTypeIdToName: Record<number, string>;
  listTypeConfig: ListTypeConfig;
  renderFn: MultiListRenderFn<T>;
  resolveTemplate: (listConfig: { en: string; cy: string; template: string }) => string;
};

export function createMultiListGuardAndRender<T>(opts: MultiListHandlerOptions<T>) {
  const { en, cy, listTypeIdToName, listTypeConfig, renderFn, resolveTemplate } = opts;

  const guardArtefact = (artefact: Artefact, res: Response): boolean => {
    const listTypeName = listTypeIdToName[artefact.listTypeId];
    if (!listTypeName || !listTypeConfig[listTypeName]) {
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
    const listTypeId = artefact.listTypeId;
    const listTypeName = listTypeIdToName[listTypeId];
    const listConfig = listTypeConfig[listTypeName];
    const listTitle = listConfig[locale as "en" | "cy"];

    const { header, hearings } = renderFn(jsonData, {
      locale,
      listTypeId,
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
      title: header.listTitle,
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
