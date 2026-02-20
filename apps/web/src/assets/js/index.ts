import { initListTypeSensitivity } from "@hmcts/admin-pages/src/assets/js/list-type-sensitivity.js";
import cookieManager from "@hmcts/cookie-manager";
import { initTableSearch } from "@hmcts/list-types-common/src/assets/js/table-search.js";
import { initBackToTop } from "@hmcts/web-core/src/assets/js/back-to-top.js";
import { initFilterPanel } from "@hmcts/web-core/src/assets/js/filter-panel.js";
import { initSearchAutocomplete } from "@hmcts/web-core/src/assets/js/search-autocomplete.js";
import { initAll } from "govuk-frontend";

initAll();

// Initialize custom components
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    await initSearchAutocomplete().catch((error) => {
      console.error("Error initializing search autocomplete:", error);
    });
    initFilterPanel();
    initBackToTop();
    initListTypeSensitivity();
    initTableSearch();
  });
} else {
  void initSearchAutocomplete().catch((error) => {
    console.error("Error initializing search autocomplete:", error);
  });
  initFilterPanel();
  initBackToTop();
  initListTypeSensitivity();
  initTableSearch();
}

const config = {
  userPreferences: {
    cookieName: "cookie_policy"
  },
  cookieBanner: {
    class: "govuk-cookie-banner",
    actions: [
      {
        name: "accept",
        buttonClass: "js-cookie-banner-accept",
        confirmationClass: "cookie-banner-accept-message",
        consent: true
      },
      {
        name: "reject",
        buttonClass: "js-cookie-banner-reject",
        confirmationClass: "cookie-banner-reject-message",
        consent: false
      },
      {
        name: "hide",
        buttonClass: "js-cookie-banner-hide"
      }
    ]
  },
  preferencesForm: {
    class: "cookie-preferences-form"
  },
  cookieManifest: [
    {
      categoryName: "essential",
      optional: false,
      matchBy: "exact",
      cookies: ["connect.sid", "_csrf", "cookie_policy", "cookies_preferences_set", "locale"]
    },
    {
      categoryName: "analytics",
      optional: true,
      cookies: ["_ga", "_gid", "dtCookie", "dtSa", "rxVisitor", "rxvt"]
    },
    {
      categoryName: "preferences",
      optional: true,
      cookies: ["language"]
    }
  ]
};

cookieManager.on("CookieBannerAction", (eventData: any) => {
  const action = typeof eventData === "string" ? eventData : eventData.action;

  // The HMCTS cookie manager will handle showing the confirmation message
  // and the hide button will remove the banner entirely
  if (action === "hide") {
    const banner = document.querySelector(".govuk-cookie-banner");
    if (banner) {
      banner.remove();
    }
  }
});

cookieManager.init(config);
