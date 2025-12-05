export const cy = {
  title: "Polisi Cwcis",
  intro: {
    paragraph1:
      "Darn bach o ddata sy'n cael ei storio ar eich cyfrifiadur, eich tabled neu eich ffôn symudol pan fyddwch yn ymweld â gwefan yw cwci. Mae angen cwcis ar y rhan fwyaf o wefannau i weithio'n iawn.",
    paragraph2: "Mae'r gwasanaeth hwn yn eu defnyddio i:",
    list: [
      "fesur sut ydych yn defnyddio'r gwasanaeth fel y gallwn ei wella a'i ddiweddaru ar sail eich anghenion",
      "cofio'r hysbysiadau rydych wedi'u gweld fel na fyddwch yn eu gweld eto",
      "storio'r atebion a roddwch dros dro",
      "Darganfyddwch fwy am sut i reoli cwcis."
    ],
    manageCookiesText: "Mwy o wybodaeth am ",
    manageCookiesLink: "sut i reoli cwcis",
    manageCookiesUrl: "https://www.aboutcookies.org/"
  },
  mainHeading: "Sut mae cwcis yn cael eu defnyddio yn y gwasanaeth Gwrandawiadau yn y Llysoedd a'r Tribiwnlysoedd",
  sections: {
    analytics: {
      heading: "I fesur faint o bobl sy'n defnyddio ein gwefan",
      description:
        "Rydym yn defnyddio meddalwedd Google Analytics i gasglu gwybodaeth am sut rydych yn defnyddio'r gwasanaeth hwn. Rydym yn gwneud hyn i helpu i sicrhau bod y gwasanaeth yn diwallu anghenion defnyddwyr ac i'n helpu i wneud gwelliannau, er enghraifft gwella'r cyfleuster chwilio.",
      storageInfo: "Mae Google Analytics yn storio gwybodaeth am:",
      storageList: [
        "y tudalennau yr ydych yn ymweld â hwy",
        "faint o amser y byddwch yn ei dreulio ar bob tudalen",
        "sut y daethoch o hyd i'r gwasanaeth",
        "yr hyn rydych chi'n clicio arno wrth ddefnyddio'r gwasanaeth"
      ],
      disclaimer:
        "Rydym yn caniatáu i Google ddefnyddio neu rannu ein data dadansoddi. Gallwch ddarganfod mwy am sut mae Google yn defnyddio'r wybodaeth hon yn eu Polisi Preifatrwydd.",
      optOutText: "Gallwch optio allan o Google Analytics os nad ydych eisiau i Google gael mynediad at eich gwybodaeth.",
      privacyPolicyLink: "Polisi Preifatrwydd",
      privacyPolicyUrl: "https://policies.google.com/technologies/partner-sites",
      optOutLink: "optio allan o Google Analytics",
      optOutUrl: "https://tools.google.com/dlpage/gaoptout",
      tableHeading: "Rhestr o'r cwcis Google Analytics a ddefnyddir.",
      cookies: [
        [
          { text: "_ga" },
          { text: "Mae'n ein helpu i gyfrif faint o bobl sy'n ymweld â'r gwasanaeth drwy olrhain os ydych wedi ymweld o'r blaen" },
          { text: "2 flynedd" }
        ],
        [{ text: "_gat" }, { text: "Rheoli faint o bobl sy'n ymweld â'r dudalen" }, { text: "10 munud" }],
        [{ text: "_gid" }, { text: "Gadael i'r gwasanaeth wybod pwy ydych chi" }, { text: "24 awr" }]
      ]
    },
    introMessage: {
      heading: "Troi ein neges gyflwyno i ffwrdd",
      description:
        "Efallai y byddwch yn gweld neges yn eich croesawu pan fyddwch yn ymweld â'r gwasanaeth am y tro cyntaf. Byddwn yn storio cwci ar eich cyfrifiadur fel ei fod yn gwybod eich bod wedi'i gweld ac yn gwybod i beidio â'i dangos eto.",
      cookies: [
        [
          { text: "seen_cookie_message" },
          { text: "Cadw neges ar eich dyfais i roi gwybod inni eich bod wedi gweld ein neges ynglŷn â chwcis" },
          { text: "1 mis" }
        ]
      ]
    },
    session: {
      heading: "Storio'r atebion a roesoch yn ystod eich ymweliad (gelwir hyn yn 'sesiwn')",
      description:
        "Caiff cwcis sesiwn eu storio ar eich dyfais wrth ichi fynd drwy wefan, ac maent yn gadael i'r wefan wybod beth rydych wedi'i weld a'i wneud hyd yn hyn. Cwcis dros dro yw'r rhain ac fe'u dilëir yn awtomatig ychydig ar ôl ichi adael y wefan.",
      cookies: [[{ text: "connect.sid" }, { text: "Gwybodaeth am eich sesiwn gyfredol" }, { text: "Pan fyddwch yn cau eich porwr" }]]
    },
    authentication: {
      heading: "Eich adnabod pan fyddwch yn dod yn ôl at y gwasanaeth",
      description: "Rydym yn defnyddio cwcis dilysu i'ch adnabod pan fyddwch yn dod yn ôl i'r gwasanaeth.",
      cookies: [[{ text: "__auth-token" }, { text: "Gadael i'r gwasanaeth wybod pwy ydych chi" }, { text: "Pan fyddwch yn cau eich porwr" }]]
    },
    security: {
      heading: "Gwneud y gwasanaeth yn fwy diogel",
      description:
        "Rydym yn gosod cwcis ar eich dyfais i rwystro hacwyr rhag addasu cynnwys y cwcis eraill rydym yn eu gosod. Mae hyn yn gwneud y gwasanaeth yn fwy diogel ac yn diogelu eich gwybodaeth bersonol.",
      cookies: [
        [{ text: "TSxxxxxxxx" }, { text: "Amddiffyn eich sesiwn rhag ymyrraeth" }, { text: "Pan fyddwch yn cau eich porwr" }],
        [{ text: "__state" }, { text: "Gadael i'r gwasanaeth wybod pwy ydych chi a diogelu eich manylion" }, { text: "Pan fyddwch yn cau eich porwr" }]
      ]
    },
    performance: {
      heading: "Mesur perfformiad y gwasanaeth",
      description:
        "Rydym yn defnyddio Platfform Deallusrwydd Meddalwedd Dynatrace i ddarparu Gwasanaeth Monitro Perfformiad i gasglu gwybodaeth am sut yr ydych yn defnyddio gwasanaethau GLlTEF. Rydym yn gwneud hyn i fonitro gwasanaethau GLlTEF er mwyn datrys problemau yn ein gwasanaethau a chasglu data ar sut y gallwn eu gwella. Mae GLlTEF yn storio gwybodaeth am:",
      storageList: ["Perfformiad y wefan", "Y defnydd a wneir o'r wefan", "Ymddygiad defnyddwyr"],
      disclaimer:
        "Cyflwynir yr wybodaeth angenrheidiol yn y Gwasanaeth Monitro Perfformiad at y dibenion a nodwyd uchod. Nid ydym yn defnyddio neu'n rhannu'r wybodaeth ar gyfer unrhyw bwrpas arall. Nid ydym yn caniatáu i Dynatrace ddefnyddio neu rannu'r wybodaeth ar gyfer unrhyw bwrpas arall.",
      cookies: [
        [{ text: "dtCookie" }, { text: "Olrhain ymweliad ar draws ceisiadau amryfal" }, { text: "Diwedd y sesiwn" }],
        [{ text: "dtLatC" }, { text: "Mesur natur gudd y gweinydd i fonitro perfformiad y gwasanaeth" }, { text: "Diwedd y sesiwn" }],
        [
          { text: "dtPC" },
          {
            text: "Canfod pwyntiau terfyn priodol ar gyfer trosglwyddo tywysydd: mae'n cynnwys rhif adnabod y sesiwn at ddibenion cydberthyniad"
          },
          { text: "Diwedd y sesiwn" }
        ],
        [{ text: "dtSa" }, { text: "Storfa gyfryngol ar gyfer gweithrediadau rhychwantu tudalennau" }, { text: "Diwedd y sesiwn" }],
        [{ text: "rxVisitor" }, { text: "Rhif adnabod ymwelydd i gyd-berthnasu sesiynau" }, { text: "1 blwyddyn" }],
        [{ text: "rxvt" }, { text: "Terfyn amser y sesiwn" }, { text: "Diwedd y sesiwn" }]
      ]
    }
  },
  tableHeaders: {
    name: "Enw",
    purpose: "Pwrpas",
    expiry: "Dyddiad dod i ben"
  },
  changeSettings: {
    heading: "Newid eich gosodiadau cwcis",
    analyticsLegend: "Caniatáu cwcis sy'n mesur defnydd o'r wefan?",
    useAnalytics: "Defnyddio cwcis sy'n mesur fy nefnydd o'r wefan",
    doNotUseAnalytics: "Peidio â defnyddio cwcis sy'n mesur fy nefnydd o'r wefan",
    performanceLegend: "Caniatáu cwcis sy'n mesur y broses o fonitro perfformiad gwefannau?",
    usePerformance: "Defnyddio cwcis sy'n mesur y broses o fonitro perfformiad gwefannau",
    doNotUsePerformance: "Peidio â defnyddio cwcis sy'n mesur y broses o fonitro perfformiad gwefannau",
    saveButton: "Cadw"
  },
  contact: {
    heading: "Cysylltwch â ni am help",
    telephone: "Ffon",
    phone: "0300 303 0656",
    hours: "Dydd Llun i ddydd Gwener 8am i 5pm"
  },
  backToTop: {
    text: "Yn ôl i frig y dudalen",
    ariaLabel: "Yn ôl i frig y dudalen"
  },
  successBanner: "Llwyddiant",
  successMessage: "Mae eich gosodiadau cwcis wedi'u cadw"
};
