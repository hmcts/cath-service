import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationsGroupedByLetter, searchLocations } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { getSubscriptionsByUserId } from "../../subscription/service.js";

const en = {
  title: "Subscribe by court or tribunal name",
  heading: "Subscribe by court or tribunal name",
  searchLabel: "Search for a court or tribunal by name",
  searchButton: "Search",
  subscribeButton: "Subscribe",
  browseLink: "Browse A-Z",
  searchResults: 'Search results for "{query}"',
  resultsCount: "{count} results",
  noResults: 'No results found for "{query}"',
  browseHeading: "Browse all courts and tribunals",
  letterHeading: "Courts and tribunals beginning with '{letter}'",
  alreadySubscribed: "Already subscribed",
  back: "Back"
};

const cy = {
  title: "Tanysgrifio yn ôl enw llys neu dribiwnlys",
  heading: "Tanysgrifio yn ôl enw llys neu dribiwnlys",
  searchLabel: "Chwilio am lys neu dribiwnlys yn ôl enw",
  searchButton: "Chwilio",
  subscribeButton: "Tanysgrifio",
  browseLink: "Pori A-Z",
  searchResults: 'Canlyniadau chwilio ar gyfer "{query}"',
  resultsCount: "{count} canlyniad",
  noResults: 'Dim canlyniadau wedi\'u canfod ar gyfer "{query}"',
  browseHeading: "Pori pob llys a thribiwnlys",
  letterHeading: "Llysoedd a thribiwnlysoedd yn dechrau gyda '{letter}'",
  alreadySubscribed: "Eisoes wedi tanysgrifio",
  back: "Yn ôl"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;
  const query = req.query.q as string | undefined;
  const view = req.query.view as string | undefined;
  const letter = req.query.letter as string | undefined;

  if (!userId) {
    return res.redirect("/login");
  }

  const userSubscriptions = await getSubscriptionsByUserId(userId);
  const subscribedLocationIds = new Set(userSubscriptions.map((s) => s.locationId));

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  if (query && query.length >= 2) {
    const results = searchLocations(query, locale);
    const resultsWithStatus = results.map((location) => ({
      ...location,
      isSubscribed: subscribedLocationIds.has(location.locationId.toString())
    }));

    return res.render("location-name-search/index", {
      ...t,
      query,
      results: resultsWithStatus,
      showResults: true,
      resultsCount: results.length
    });
  }

  if (view === "browse") {
    const grouped = getLocationsGroupedByLetter(locale);
    const targetLetter = letter?.toUpperCase() || "A";
    const locationsForLetter = grouped[targetLetter] || [];

    const locationsWithStatus = locationsForLetter.map((location) => ({
      ...location,
      isSubscribed: subscribedLocationIds.has(location.locationId.toString())
    }));

    return res.render("location-name-search/index", {
      ...t,
      showBrowse: true,
      letters: Object.keys(grouped).sort(),
      selectedLetter: targetLetter,
      locations: locationsWithStatus
    });
  }

  res.render("location-name-search/index", {
    ...t,
    showSearch: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { locationId } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  if (!locationId) {
    return res.redirect("/location-name-search");
  }

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  if (!req.session.emailSubscriptions.pendingSubscriptions) {
    req.session.emailSubscriptions.pendingSubscriptions = [];
  }

  if (!req.session.emailSubscriptions.pendingSubscriptions.includes(locationId)) {
    req.session.emailSubscriptions.pendingSubscriptions.push(locationId);
  }

  res.redirect("/pending-subscriptions");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
