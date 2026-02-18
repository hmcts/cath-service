import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { mockListTypes } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { createListTypeSubscriptions } from "@hmcts/subscription-list-types";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import "../../types/session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

// Helper to format language array for display
const formatLanguageDisplay = (languages: string[] | undefined, locale: string) => {
  if (!languages || languages.length === 0) return "";
  if (languages.length === 2) {
    return locale === "cy" ? "Cymraeg a Saesneg" : "English and Welsh";
  }
  if (languages[0] === "ENGLISH") {
    return locale === "cy" ? "Saesneg" : "English";
  }
  return locale === "cy" ? "Cymraeg" : "Welsh";
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.session.listTypeSubscription || !req.session.listTypeSubscription.selectedListTypeIds) {
    return res.redirect("/subscription-list-types");
  }

  // Validate language is present
  if (!req.session.listTypeSubscription.language) {
    return res.redirect("/subscription-list-language");
  }

  // Handle remove location action via query parameter
  const removeLocationId = req.query.removeLocation;
  if (removeLocationId) {
    const locationId = Number(removeLocationId);
    if (Number.isFinite(locationId)) {
      if (!req.session.listTypeSubscription.selectedLocationIds) {
        req.session.listTypeSubscription.selectedLocationIds = [];
      }
      req.session.listTypeSubscription.selectedLocationIds = req.session.listTypeSubscription.selectedLocationIds.filter((id: number) => id !== locationId);
      // Save session and redirect
      return req.session.save((err: Error | null) => {
        if (err) {
          console.error("Error saving session", { errorMessage: err.message });
        }
        res.redirect("/subscription-confirm");
      });
    }
  }

  // Handle remove list type action via query parameter
  const removeListTypeId = req.query.removeListType;
  if (removeListTypeId) {
    const listTypeId = Number(removeListTypeId);
    if (Number.isFinite(listTypeId) && req.session.listTypeSubscription.selectedListTypeIds) {
      req.session.listTypeSubscription.selectedListTypeIds = req.session.listTypeSubscription.selectedListTypeIds.filter((id: number) => id !== listTypeId);

      // Save session and redirect to remove query param
      return req.session.save((err: Error | null) => {
        if (err) {
          console.error("Error saving session", { errorMessage: err.message });
        }
        res.redirect("/subscription-confirm");
      });
    }
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  // Get selected locations
  const selectedLocationIds = req.session.listTypeSubscription.selectedLocationIds || [];
  const selectedLocations = await Promise.all(
    selectedLocationIds.map(async (id: number) => {
      const location = await getLocationById(id);
      return location
        ? {
            locationId: id,
            name: locale === "cy" ? location.welshName : location.name
          }
        : null;
    })
  );
  const locations = selectedLocations.filter(Boolean);

  const selectedListTypes = mockListTypes.filter((lt) => req.session.listTypeSubscription?.selectedListTypeIds?.includes(lt.id));

  // Helper to build URLs with locale parameter
  const localeParam = locale === "cy" ? "&lng=cy" : "";

  // Build table rows
  const locationRows = locations.map((location) => [
    { text: location.name },
    {
      html: `<a href="/subscription-confirm?removeLocation=${location.locationId}${localeParam}" class="govuk-link">${t.removeLink}<span class="govuk-visually-hidden"> ${location.name}</span></a>`,
      classes: "govuk-table__cell--numeric"
    }
  ]);

  const listTypeRows = selectedListTypes.map((listType) => {
    const listTypeName = locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName;
    return [
      { text: listTypeName },
      {
        html: `<a href="/subscription-confirm?removeListType=${listType.id}${localeParam}" class="govuk-link">${t.removeLink}<span class="govuk-visually-hidden"> ${listTypeName}</span></a>`,
        classes: "govuk-table__cell--numeric"
      }
    ];
  });

  const languageRows = [
    [
      { text: formatLanguageDisplay(req.session.listTypeSubscription.language, locale) },
      {
        html: `<a href="/subscription-list-language${locale === "cy" ? "?lng=cy" : ""}" class="govuk-link">${t.changeLink}<span class="govuk-visually-hidden"> ${t.languageHeading}</span></a>`,
        classes: "govuk-table__cell--numeric"
      }
    ]
  ];

  // Check for empty selections and build errors
  const errors = [];
  const hasNoListTypes = selectedListTypes.length === 0;
  const hasNoLocations = locations.length === 0;
  const hasNoSubscriptions = hasNoLocations && hasNoListTypes;

  // Only show error if no list types selected (locations are optional)
  if (hasNoListTypes) {
    errors.push({ text: t.errorNoListTypes, href: "#list-types" });
  }

  res.render("subscription-confirm/index", {
    ...t,
    locale,
    hasLocations: locations.length > 0,
    locationRows,
    listTypeRows,
    languageRows,
    hasNoListTypes,
    hasNoSubscriptions,
    errors: errors.length > 0 ? errors : undefined,
    csrfToken: getCsrfToken(req)
  });
};

const getUserFriendlyErrorMessage = (error: Error, t: typeof en | typeof cy) => {
  if (error.message.includes("Maximum") || error.message.includes("50")) {
    return t.errorMaxSubscriptions;
  }
  if (error.message.includes("Already subscribed") || error.message.includes("duplicate")) {
    return t.errorDuplicateSubscription;
  }
  return t.errorGeneric;
};

const postHandler = async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  if (!req.session.listTypeSubscription || !req.session.listTypeSubscription.selectedListTypeIds) {
    return res.redirect("/subscription-list-types");
  }

  // Check if list types array is empty
  if (req.session.listTypeSubscription.selectedListTypeIds.length === 0) {
    return res.redirect("/subscription-list-types");
  }

  // Validate language is present
  if (!req.session.listTypeSubscription.language) {
    return res.redirect("/subscription-list-language");
  }

  try {
    await createListTypeSubscriptions(req.user.id, req.session.listTypeSubscription.selectedListTypeIds, req.session.listTypeSubscription.language);

    const selectedLocationIds = req.session.listTypeSubscription.selectedLocationIds || [];
    delete req.session.listTypeSubscription;

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    req.session.emailSubscriptions.confirmationComplete = true;
    req.session.emailSubscriptions.confirmedLocations = selectedLocationIds.map(String);

    req.session.save((err: Error | null) => {
      if (err) {
        console.error("Error saving session", { errorMessage: err.message });
        return res.redirect("/subscription-confirm");
      }
      res.redirect("/subscription-confirmed");
    });
  } catch (error) {
    console.error("Error creating list type subscriptions", { errorMessage: error instanceof Error ? error.message : "Unknown error" });
    const locale = res.locals.locale || "en";
    const t = locale === "cy" ? cy : en;

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    // Get selected locations
    const selectedLocationIds = req.session.listTypeSubscription?.selectedLocationIds || [];
    const selectedLocations = await Promise.all(
      selectedLocationIds.map(async (id: number) => {
        const location = await getLocationById(id);
        return location
          ? {
              locationId: id,
              name: locale === "cy" ? location.welshName : location.name
            }
          : null;
      })
    );
    const locations = selectedLocations.filter(Boolean);

    const selectedListTypes = mockListTypes.filter((lt) => req.session.listTypeSubscription?.selectedListTypeIds?.includes(lt.id));

    // Build table rows
    const locationRows = locations.map((location) => [
      { text: location.name },
      {
        html: `<a href="/subscription-confirm?removeLocation=${location.locationId}" class="govuk-link">${t.removeLink}<span class="govuk-visually-hidden"> ${location.name}</span></a>`,
        classes: "govuk-table__cell--numeric"
      }
    ]);

    const listTypeRows = selectedListTypes.map((listType) => {
      const listTypeName = locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName;
      return [
        { text: listTypeName },
        {
          html: `<a href="/subscription-confirm?removeListType=${listType.id}" class="govuk-link">${t.removeLink}<span class="govuk-visually-hidden"> ${listTypeName}</span></a>`,
          classes: "govuk-table__cell--numeric"
        }
      ];
    });

    const languageRows = [
      [
        { text: formatLanguageDisplay(req.session.listTypeSubscription?.language, locale) },
        {
          html: `<a href="/subscription-list-language" class="govuk-link">${t.changeLink}<span class="govuk-visually-hidden"> ${t.languageHeading}</span></a>`,
          classes: "govuk-table__cell--numeric"
        }
      ]
    ];

    const errorMessage = error instanceof Error ? getUserFriendlyErrorMessage(error, t) : t.errorGeneric;
    const hasNoListTypes = selectedListTypes.length === 0;
    const hasNoLocations = locations.length === 0;
    const hasNoSubscriptions = hasNoLocations && hasNoListTypes;

    return res.render("subscription-confirm/index", {
      ...t,
      locale,
      hasLocations: locations.length > 0,
      locationRows,
      listTypeRows,
      languageRows,
      hasNoListTypes,
      hasNoSubscriptions,
      errors: [{ text: errorMessage, href: "#" }],
      csrfToken: getCsrfToken(req)
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
