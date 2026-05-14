import { requireRole, USER_ROLES } from "@hmcts/auth";
import { mockListTypes } from "@hmcts/list-types-common";
import { findThirdPartyUserById, updateThirdPartySubscriptions } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import type { Session } from "express-session";
import { isFeatureEnabled } from "../../../../../feature-flags/launch-darkly.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const PAGE_SIZE = 20;
const LD_FLAG_RADIO_BUTTONS = "third-party-subscriptions-radio-buttons";

interface ThirdPartySubscriptionsSession extends Session {
  thirdPartySubscriptions?: {
    userId: string;
    pending: Record<string, string>;
  };
}

type Language = "en" | "cy";

export const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;
  const page = Math.max(1, Number.parseInt((req.query.page as string) ?? "1", 10) || 1);

  const user = await findThirdPartyUserById(id);
  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  const session = req.session as ThirdPartySubscriptionsSession;
  if (!session.thirdPartySubscriptions || session.thirdPartySubscriptions.userId !== id) {
    const existing: Record<string, string> = {};
    for (const sub of user.subscriptions) {
      existing[sub.listType] = sub.sensitivity;
    }
    session.thirdPartySubscriptions = { userId: id, pending: existing };
  }

  const useDropdown = !(await isFeatureEnabled(LD_FLAG_RADIO_BUTTONS, req.user?.id ?? "anonymous"));
  const totalPages = Math.ceil(mockListTypes.length / PAGE_SIZE);
  const pageListTypes = mockListTypes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  res.render("third-party-users/[id]/subscriptions/manage/index", {
    ...t,
    lngParam,
    userId: id,
    userName: user.name,
    useDropdown,
    listTypes: pageListTypes,
    currentSubscriptions: session.thirdPartySubscriptions.pending,
    currentPage: page,
    totalPages,
    isLastPage: page >= totalPages,
    pageOf: t.pageOf(page, totalPages)
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const lngParam = req.query.lng === "cy" ? "?lng=cy" : "";
  const { id } = req.params;
  const page = Math.max(1, Number.parseInt((req.query.page as string) ?? "1", 10) || 1);

  const user = await findThirdPartyUserById(id);
  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  const session = req.session as ThirdPartySubscriptionsSession;
  if (!session.thirdPartySubscriptions) {
    session.thirdPartySubscriptions = { userId: id, pending: {} };
  }

  const pageListTypes = mockListTypes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  for (const listType of pageListTypes) {
    const value = req.body[listType.name] as string | undefined;
    if (value && value !== "UNSELECTED" && value !== "") {
      session.thirdPartySubscriptions.pending[listType.name] = value;
    } else {
      delete session.thirdPartySubscriptions.pending[listType.name];
    }
  }

  const totalPages = Math.ceil(mockListTypes.length / PAGE_SIZE);
  const isLastPage = page >= totalPages;

  if (!isLastPage) {
    const nextPage = page + 1;
    return res.redirect(`/third-party-users/${id}/subscriptions/manage?page=${nextPage}${lngParam ? `&lng=cy` : ""}`);
  }

  const beforeSubscriptions = user.subscriptions.map((s) => `${s.listType}:${s.sensitivity}`).join(", ");
  const afterSubscriptions = Object.entries(session.thirdPartySubscriptions.pending)
    .map(([lt, sens]) => `${lt}:${sens}`)
    .join(", ");

  await updateThirdPartySubscriptions(id, session.thirdPartySubscriptions.pending);

  delete session.thirdPartySubscriptions;

  req.auditMetadata = {
    shouldLog: true,
    action: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS",
    entityInfo: `User: ${user.name}, Before: [${beforeSubscriptions}], After: [${afterSubscriptions}]`
  };

  res.redirect(`/third-party-users/${id}/subscriptions/success${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
