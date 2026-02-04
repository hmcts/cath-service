import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { searchUsers } from "../../user-management/queries.js";
import { validateSearchFilters } from "../../user-management/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface UserManagementSession {
  userManagement?: {
    filters?: {
      email?: string;
      userId?: string;
      userProvenanceId?: string;
      roles?: string[];
      provenances?: string[];
    };
    page?: number;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const session = req.session as UserManagementSession;
  const filters = session.userManagement?.filters || {};
  const page = Number(req.query.page) || session.userManagement?.page || 1;

  let searchResult: Awaited<ReturnType<typeof searchUsers>>;
  let noResultsError: { text: string; href: string } | null = null;

  try {
    searchResult = await searchUsers(filters, page);

    const hasActiveFilters = Object.values(filters).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));
    if (searchResult.totalCount === 0 && hasActiveFilters) {
      noResultsError = {
        text: content.noResultsError,
        href: "#email"
      };
    }
  } catch (error) {
    console.error("Error searching users:", {
      error,
      filters,
      page,
      timestamp: new Date().toISOString()
    });
    searchResult = {
      users: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0
    };
  }

  const lngParam = language === "cy" ? "?lng=cy" : "";
  const lngQueryParam = language === "cy" ? "&lng=cy" : "";

  // Build selected filter groups
  const selectedFilterGroups = [];

  if (filters.email) {
    selectedFilterGroups.push({
      heading: content.emailLabel,
      tags: [
        {
          label: filters.email,
          removeUrl: `/find-users/remove-filter?filter=email${lngQueryParam}`
        }
      ]
    });
  }

  if (filters.userId) {
    selectedFilterGroups.push({
      heading: content.userIdLabel,
      tags: [
        {
          label: filters.userId,
          removeUrl: `/find-users/remove-filter?filter=userId${lngQueryParam}`
        }
      ]
    });
  }

  if (filters.userProvenanceId) {
    selectedFilterGroups.push({
      heading: content.userProvenanceIdLabel,
      tags: [
        {
          label: filters.userProvenanceId,
          removeUrl: `/find-users/remove-filter?filter=userProvenanceId${lngQueryParam}`
        }
      ]
    });
  }

  if (filters.roles && filters.roles.length > 0) {
    const roleLabels: Record<string, string> = {
      VERIFIED: content.roleVerified,
      INTERNAL_ADMIN_CTSC: content.roleCtscAdmin,
      INTERNAL_ADMIN_LOCAL: content.roleLocalAdmin,
      SYSTEM_ADMIN: content.roleSystemAdmin
    };

    selectedFilterGroups.push({
      heading: content.rolesLabel,
      tags: filters.roles.map((role) => ({
        label: roleLabels[role] || role,
        removeUrl: `/find-users/remove-filter?filter=role&value=${role}${lngQueryParam}`
      }))
    });
  }

  if (filters.provenances && filters.provenances.length > 0) {
    const provenanceLabels: Record<string, string> = {
      CFT_IDAM: content.provenanceCftIdam,
      SSO: content.provenanceSso,
      B2C: content.provenanceB2c,
      CRIME_IDAM: content.provenanceCrimeIdam
    };

    selectedFilterGroups.push({
      heading: content.provenancesLabel,
      tags: filters.provenances.map((provenance) => ({
        label: provenanceLabels[provenance] || provenance,
        removeUrl: `/find-users/remove-filter?filter=provenance&value=${provenance}${lngQueryParam}`
      }))
    });
  }

  // Create label mappings for table display
  const roleLabels: Record<string, string> = {
    VERIFIED: content.roleVerified,
    INTERNAL_ADMIN_CTSC: content.roleCtscAdmin,
    INTERNAL_ADMIN_LOCAL: content.roleLocalAdmin,
    SYSTEM_ADMIN: content.roleSystemAdmin
  };

  const provenanceLabels: Record<string, string> = {
    CFT_IDAM: content.provenanceCftIdam,
    SSO: content.provenanceSso,
    B2C: content.provenanceB2c,
    CRIME_IDAM: content.provenanceCrimeIdam
  };

  const userRows = searchResult.users.map((user) => [
    { text: user.email },
    { text: roleLabels[user.role] || user.role },
    { text: provenanceLabels[user.userProvenance] || user.userProvenance },
    { html: `<a href="/manage-user/${user.userId}${lngParam}" class="govuk-link">${content.manageLink}</a>` }
  ]);

  // Build pagination items
  const paginationItems = [];
  const { currentPage, totalPages } = searchResult;

  if (currentPage > 1) {
    paginationItems.push({
      number: currentPage - 1,
      visuallyHiddenText: content.paginationPrevious,
      href: `/find-users?page=${currentPage - 1}${lngQueryParam}`
    });
  }

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    paginationItems.push({
      number: pageNum,
      current: pageNum === currentPage,
      href: `/find-users?page=${pageNum}${lngQueryParam}`
    });
  }

  if (currentPage < totalPages) {
    paginationItems.push({
      number: currentPage + 1,
      visuallyHiddenText: content.paginationNext,
      href: `/find-users?page=${currentPage + 1}${lngQueryParam}`
    });
  }

  res.render("find-users/index", {
    ...content,
    userRows,
    totalCount: searchResult.totalCount,
    currentPage: searchResult.currentPage,
    totalPages: searchResult.totalPages,
    paginationItems,
    filters,
    selectedFilterGroups,
    hasFilters: selectedFilterGroups.length > 0,
    errors: noResultsError ? [noResultsError] : undefined,
    lng: language === "cy" ? "cy" : ""
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const filters = {
    email: req.body.email?.trim() || undefined,
    userId: req.body.userId?.trim() || undefined,
    userProvenanceId: req.body.userProvenanceId?.trim() || undefined,
    roles: Array.isArray(req.body.roles) ? req.body.roles : req.body.roles ? [req.body.roles] : undefined,
    provenances: Array.isArray(req.body.provenances) ? req.body.provenances : req.body.provenances ? [req.body.provenances] : undefined
  };

  const validationErrors = validateSearchFilters(filters);

  if (validationErrors.length > 0) {
    const searchResult = await searchUsers({}, 1);
    return res.render("find-users/index", {
      ...content,
      users: searchResult.users,
      totalCount: searchResult.totalCount,
      currentPage: 1,
      totalPages: searchResult.totalPages,
      filters,
      errors: validationErrors,
      lng: language === "cy" ? "cy" : ""
    });
  }

  const session = req.session as UserManagementSession;
  if (!session.userManagement) {
    session.userManagement = {};
  }

  session.userManagement.filters = filters;
  session.userManagement.page = 1;

  res.redirect(`/find-users${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
