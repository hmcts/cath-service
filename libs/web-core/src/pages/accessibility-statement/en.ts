export const en = {
  title: "Accessibility statement",
  sections: {
    intro: {
      content: "This accessibility statement applies to this service.",
      commitment: "We want as many people as possible to be able to use this website. For example, that means you should be able to:",
      features: [
        "change colours, contrast levels and fonts",
        "zoom in up to 300% without the text spilling off the screen",
        "navigate most of the website using just a keyboard",
        "navigate most of the website using speech recognition software",
        "listen to most of the website using a screen reader (including the most recent versions of JAWS, NVDA and VoiceOver)"
      ],
      simpleLanguage: "We've also made the website text as simple as possible to understand.",
      abilityNet: "AbilityNet has advice on making your device easier to use if you have a disability."
    },
    howAccessible: {
      heading: "How accessible this website is",
      content: "We know some parts of this website are not fully accessible:",
      issues: [
        "the text will not reflow in a single column when you change the size of the browser window",
        "you cannot modify the line height or spacing of text",
        "most older PDF documents are not fully accessible to screen reader software",
        "live video streams do not have captions",
        "some of our online forms are difficult to navigate using just a keyboard",
        "you cannot skip to the main content when using a screen reader",
        "there's a limit to how far you can magnify the map on our 'contact us' page"
      ]
    },
    feedback: {
      heading: "Feedback and contact information",
      content: "If you need information on this website in a different format like accessible PDF, large print, easy read, audio recording or braille:",
      contact: {
        email: "Email: enquiries@hmcts.gsi.gov.uk",
        phone: "Telephone: 0300 303 0642",
        hours: "Monday to Friday, 9am to 5pm"
      },
      response: "We'll consider your request and get back to you in 5 working days."
    },
    reporting: {
      heading: "Reporting accessibility problems with this website",
      content:
        "We're always looking to improve the accessibility of this website. If you find any problems not listed on this page or think we're not meeting accessibility requirements, contact:",
      contact: {
        email: "Email: enquiries@hmcts.gsi.gov.uk",
        phone: "Telephone: 0300 303 0642"
      }
    },
    enforcement: {
      heading: "Enforcement procedure",
      content: [
        "The Equality and Human Rights Commission (EHRC) is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 (the 'accessibility regulations').",
        "If you're not happy with how we respond to your complaint, contact the Equality Advisory and Support Service (EASS)."
      ]
    },
    technical: {
      heading: "Technical information about this website's accessibility",
      content:
        "HMCTS is committed to making its website accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018."
    },
    compliance: {
      heading: "Compliance status",
      content:
        "This website is partially compliant with the Web Content Accessibility Guidelines version 2.1 AA standard, due to the non-compliances listed below."
    },
    nonAccessible: {
      heading: "Non-accessible content",
      intro: "The content listed below is non-accessible for the following reasons.",
      nonCompliance: {
        heading: "Non-compliance with the accessibility regulations",
        issues: [
          "Some images do not have a text alternative, so people using a screen reader cannot access the information. This fails WCAG 2.1 success criterion 1.1.1 (non-text content).",
          "Some of our online forms are difficult to navigate using a keyboard. For example, because some form controls are missing a 'label' tag. This fails WCAG 2.1 success criterion 2.4.6 (headings and labels).",
          "Some of our online forms have fields where the purpose is not identified. This means the information cannot be filled in automatically. This fails WCAG 2.1 success criterion 1.3.5 (identify input purpose).",
          "Some heading elements are not consistent, or skip heading levels. This fails WCAG 2.1 success criterion 1.3.1 (info and relationships).",
          "Some of our interactive forms are not compatible with screen readers. This fails WCAG 2.1 success criterion 4.1.2 (name, role value).",
          "Our forms are not always compatible with browser auto-complete functions. This fails WCAG 2.1 success criterion 1.3.5 (identify input purpose)."
        ],
        fixing: "We're working to fix these issues."
      },
      disproportionateBurden: {
        heading: "Disproportionate burden",
        content: "Not applicable"
      },
      outsideScope: {
        heading: "Content that's not within the scope of the accessibility regulations",
        pdfs: {
          heading: "PDFs and other documents",
          content: [
            "Many of our older PDFs and Word documents do not meet accessibility standards - for example, they may not be structured so they're accessible to a screen reader. This does not apply to PDFs or other documents published from September 2018.",
            "Some of our PDFs and Word documents are essential to providing our services. For example, we have PDFs with information on how users can access our services, and forms published as Word documents. By September 2020, we plan to either fix these or replace them with accessible HTML pages."
          ]
        }
      }
    },
    testing: {
      heading: "What we're doing to improve accessibility",
      content: "We're currently working on fixing the accessibility issues listed in this statement."
    },
    preparation: {
      heading: "Preparation of this accessibility statement",
      content: [
        "This statement was prepared on 23 September 2019. It was last reviewed on 23 September 2024.",
        "This website was last tested on 1 September 2024. The test was carried out by the Digital Accessibility Centre (DAC).",
        "We tested all pages of the website."
      ]
    }
  }
};
