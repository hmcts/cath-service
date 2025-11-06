import { USER_ROLES } from "../user/roles.js";

interface NavigationItem {
  text: string;
  href: string;
  current?: boolean;
  attributes?: Record<string, string>;
}

/**
 * Builds navigation items based on user role
 * - SYSTEM_ADMIN: sees Dashboard and Admin Dashboard
 * - INTERNAL_ADMIN_CTSC and INTERNAL_ADMIN_LOCAL: sees only Admin Dashboard
 *
 * @param userRole - The user's role from req.user.role
 * @param currentPath - The current page path to mark as active
 * @returns Array of navigation items
 */
export function buildNavigationItems(userRole: string | undefined, currentPath: string): NavigationItem[] {
  if (!userRole) {
    return [];
  }

  const items: NavigationItem[] = [];

  // SYSTEM_ADMIN sees both Dashboard and Admin Dashboard
  if (userRole === USER_ROLES.SYSTEM_ADMIN) {
    items.push({
      text: "Dashboard",
      href: "/system-admin-dashboard",
      current: currentPath === "/system-admin-dashboard",
      attributes: {
        "data-test": "system-admin-dashboard-link"
      }
    });
    items.push({
      text: "Admin Dashboard",
      href: "/admin-dashboard",
      current: currentPath === "/admin-dashboard",
      attributes: {
        "data-test": "admin-dashboard-link"
      }
    });
  }

  // CTSC and Local admins see only Admin Dashboard
  if (userRole === USER_ROLES.INTERNAL_ADMIN_CTSC || userRole === USER_ROLES.INTERNAL_ADMIN_LOCAL) {
    items.push({
      text: "Admin Dashboard",
      href: "/admin-dashboard",
      current: currentPath === "/admin-dashboard",
      attributes: {
        "data-test": "admin-dashboard-link"
      }
    });
  }

  return items;
}

/**
 * Builds navigation items for verified users (non-SSO authenticated users)
 * @param currentPath - The current page path to mark as active
 * @param locale - The locale for translations (en or cy)
 * @returns Array of navigation items
 */
export function buildVerifiedUserNavigation(currentPath: string, locale: string = "en"): NavigationItem[] {
  const translations = {
    en: {
      dashboard: "Dashboard",
      emailSubscriptions: "Email subscriptions"
    },
    cy: {
      dashboard: "Dangosfwrdd",
      emailSubscriptions: "Tanysgrifiadau e-bost"
    }
  };

  const t = locale === "cy" ? translations.cy : translations.en;

  return [
    {
      text: t.dashboard,
      href: "/account-home",
      current: currentPath === "/account-home",
      attributes: {
        "data-test": "dashboard-link"
      }
    },
    {
      text: t.emailSubscriptions,
      href: "/",
      current: currentPath === "/",
      attributes: {
        "data-test": "email-subscriptions-link"
      }
    }
  ];
}
