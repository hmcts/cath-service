export const en = {
  title: "Cookie policy",
  intro: {
    paragraph1:
      "A cookie is a small piece of data that's stored on your computer, tablet, or phone when you visit a website. Most websites need cookies to work properly.",
    paragraph2: "This service uses them to:",
    list: [
      "measure how you use the service so it can be updated and improved based on your needs",
      "remember the notifications you've seen so that you're not shown them again",
      "temporarily store the answers you give",
      "Find out more about how to manage cookies."
    ],
    manageCookiesText: "Find out more about ",
    manageCookiesLink: "how to manage cookies",
    manageCookiesUrl: "https://www.aboutcookies.org/"
  },
  mainHeading: "How cookies are used in the Courts and tribunal hearings service",
  sections: {
    analytics: {
      heading: "To measure website usage",
      description:
        "We use Google Analytics software to collect information about how you use this service. We do this to help make sure the service is meeting the needs of its users and to help us make improvements, for example improving site search.",
      storageInfo: "Google Analytics stores information about:",
      storageList: [
        "the pages you visit",
        "how long you spend on each page",
        "how you got to the service",
        "what you click on while you're visiting the service"
      ],
      disclaimer: "We allow Google to use or share our analytics data. You can find out more about how Google use this information in their Privacy Policy.",
      optOutText: "You can opt out of Google Analytics if you do not want Google to have access to your information.",
      privacyPolicyLink: "Privacy Policy",
      privacyPolicyUrl: "https://policies.google.com/technologies/partner-sites",
      optOutLink: "opt out of Google Analytics",
      optOutUrl: "https://tools.google.com/dlpage/gaoptout",
      tableHeading: "List of google analytics cookies used.",
      cookies: [
        [{ text: "_ga" }, { text: "This helps us count how many people visit the service by tracking if you've visited before" }, { text: "2 years" }],
        [{ text: "_gat" }, { text: "Manages the rate at which page view requests are made" }, { text: "10 minutes" }],
        [{ text: "_gid" }, { text: "Identifies you to the service" }, { text: "24 hours" }]
      ]
    },
    introMessage: {
      heading: "To turn our introductory message off",
      description:
        "You may see a pop-up welcome message when you first visit the service. We'll store a cookie so that your computer knows you've seen it and knows not to show it again.",
      cookies: [[{ text: "seen_cookie_message" }, { text: "Saves a message to let us know that you've seen our cookie message" }, { text: "1 month" }]]
    },
    session: {
      heading: "To store the answers you've given during your visit (known as a 'session')",
      description:
        "Session cookies are stored on your computer as you travel through a website, and let the website know what you've seen and done so far. These are temporary cookies and are automatically deleted a short while after you leave the website.",
      cookies: [[{ text: "connect.sid" }, { text: "Carries details of your current session" }, { text: "When you close your browser" }]]
    },
    authentication: {
      heading: "To identify you when you come back to the service",
      description: "We use authentication cookies to identify you when you return to the service.",
      cookies: [[{ text: "__auth-token" }, { text: "Identifies you to the service" }, { text: "When you close your browser" }]]
    },
    security: {
      heading: "To make the service more secure",
      description:
        "We set cookies which prevent attackers from modifying the contents of the other cookies we set. This makes the service more secure and protects your personal information.",
      cookies: [
        [{ text: "TSxxxxxxxx" }, { text: "Protects your session from tampering" }, { text: "When you close your browser" }],
        [{ text: "__state" }, { text: "Identifies you to the service and secures your authentication" }, { text: "When you close your browser" }]
      ]
    },
    performance: {
      heading: "To measure application performance",
      description:
        "We use Dynatrace Software Intelligence Platform to provide an Application Performance Monitoring Service to collect information about how you use HMCTS services. We do this to monitor HMCTS services in order to resolve issues within our services as well as collect data on how our services can be improved. HMCTS store information about:",
      storageList: ["Site performance", "Website usage", "User behaviour"],
      disclaimer:
        "Information is presented within the Application Performance Monitoring service for the purposes detailed above. We do not use or share the information for any other purpose. We do not allow Dynatrace to use or share the information for any other purposes.",
      cookies: [
        [{ text: "dtCookie" }, { text: "Tracks a visit across multiple request" }, { text: "Session end" }],
        [{ text: "dtLatC" }, { text: "Measures server latency for performance monitoring" }, { text: "Session end" }],
        [
          { text: "dtPC" },
          { text: "Required to identify proper endpoints for beacon transmission; includes session ID for correlation" },
          { text: "Session end" }
        ],
        [{ text: "dtSa" }, { text: "Intermediate store for page-spanning actions" }, { text: "Session end" }],
        [{ text: "rxVisitor" }, { text: "Visitor ID to correlate sessions" }, { text: "1 year" }],
        [{ text: "rxvt" }, { text: "Session timeout" }, { text: "Session end" }]
      ]
    }
  },
  tableHeaders: {
    name: "Name",
    purpose: "Purpose",
    expiry: "Expires"
  },
  changeSettings: {
    heading: "Change your cookie settings",
    analyticsLegend: "Allow cookies that measure website use?",
    useAnalytics: "Use cookies that measure my website use",
    doNotUseAnalytics: "Do not use cookies that measure my website use",
    performanceLegend: "Allow cookies that measure website application performance monitoring?",
    usePerformance: "Use cookies that measure website application performance monitoring",
    doNotUsePerformance: "Do not cookies that measure website application performance monitoring",
    saveButton: "Save"
  },
  contact: {
    heading: "Contact us for help",
    telephone: "Telephone",
    phone: "0300 303 0656",
    hours: "Monday to Friday 8am to 5pm"
  },
  backToTop: {
    text: "Back to top",
    ariaLabel: "Back to top of page"
  },
  successBanner: "Success",
  successMessage: "Your cookie settings have been saved"
};
