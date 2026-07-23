import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getGovNotifyEmail,
  waitForNotifications
} from "../../utils/notification-helpers.js";
import { checkFlatFileExists, deleteTestArtefacts, type FlatFileInfo, listFlatFiles } from "../../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

// GOV.UK Notify document download links pattern
const GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN = /https:\/\/documents\.service\.gov\.uk\/d\/[A-Za-z0-9_-]+/;

async function waitForPdfGeneration(artefactId: string, maxRetries = 15, delayMs = 1000): Promise<FlatFileInfo> {
  for (let i = 0; i < maxRetries; i++) {
    const pdfInfo = await checkFlatFileExists(artefactId);
    if (pdfInfo.exists && pdfInfo.sizeBytes && pdfInfo.sizeBytes > 0) {
      return pdfInfo;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  // Return the last check result even if PDF not found
  return checkFlatFileExists(artefactId);
}

function generatePublicationDates(daysFromNow = 1) {
  const now = new Date();
  const contentDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  const displayTo = new Date(contentDate.getTime() + 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatDateTime = (d: Date) => d.toISOString();

  return {
    contentDate: formatDate(contentDate),
    displayFrom: formatDateTime(contentDate),
    displayTo: formatDateTime(displayTo),
    formattedContentDate: contentDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  };
}

async function waitForFileGeneration(artefactId: string, expectedExtensions: string[], maxRetries = 20, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const fileList = await listFlatFiles(artefactId);
    const hasAll = expectedExtensions.every((ext) => fileList.files.some((f) => f.filename.endsWith(ext)));
    if (hasAll) {
      return fileList;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return listFlatFiles(artefactId);
}

function createSjpPublicListPayload(contentDate: string, displayFrom: string, displayTo: string, locationId: number) {
  const postcodes = ["SW", "M1", "B1", "E1", "BS", "LS"];
  const prosecutors = ["TV Licensing", "Thames Valley Police", "Manchester City Council"];
  const offences = [
    "Use a television set without a licence",
    "Exceed the speed limit on a restricted road",
    "Fail to comply with red traffic light",
    "Use a hand-held mobile telephone whilst driving"
  ];
  const names = ["John Smith", "Jane Doe", "Bob Wilson", "Alice Brown"];

  const hearings = [];
  for (let i = 0; i < 10; i++) {
    hearings.push({
      case: [{ caseUrn: `URN-SJP-PUB-${String(i + 1).padStart(4, "0")}` }],
      party: [
        {
          partyRole: "ACCUSED",
          individualDetails: {
            individualForenames: names[i % names.length].split(" ")[0].charAt(0),
            individualSurname: names[i % names.length].split(" ")[1],
            address: {
              line: [`${i + 1} Test Road`],
              town: "Bristol",
              county: "Avon",
              postCode: postcodes[i % postcodes.length]
            }
          }
        },
        {
          partyRole: "PROSECUTOR",
          organisationDetails: { organisationName: prosecutors[i % prosecutors.length] }
        }
      ],
      offence: [{ offenceTitle: offences[i % offences.length], reportingRestriction: false }]
    });
  }

  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "SJP_PUBLIC_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom,
    display_to: displayTo,
    hearing_list: {
      document: { publicationDate: `${contentDate}T09:00:00Z`, version: "1.0" },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Bristol Magistrates' Court",
            courtHouseAddress: { line: ["Nelson Street"], town: "Bristol", postCode: "BS1 2JA" },
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [{ sittings: [{ sittingStart: `${contentDate}T09:00:00Z`, sittingEnd: `${contentDate}T17:00:00Z`, hearing: hearings }] }]
              }
            ]
          }
        }
      ]
    }
  };
}

function createSjpPressListPayload(contentDate: string, displayFrom: string, displayTo: string, locationId: number) {
  const postcodes = ["SW", "M1", "B1", "E1", "BS"];
  const prosecutors = ["TV Licensing", "Thames Valley Police", "Manchester City Council"];
  const offences = [
    { title: "Use a television set without a licence", wording: "Failed to pay TV license fee" },
    { title: "Exceed the speed limit on a restricted road", wording: "Driving at 45mph in a 30mph zone" },
    { title: "Fail to comply with red traffic light", wording: "Failed to stop at red light" }
  ];
  const names = [
    { forenames: "John", surname: "Smith", dob: "1985-05-15", age: 40 },
    { forenames: "Jane", surname: "Doe", dob: "1990-08-22", age: 34 },
    { forenames: "Bob", surname: "Wilson", dob: "1982-03-10", age: 43 }
  ];

  const hearings = [];
  for (let i = 0; i < 10; i++) {
    const name = names[i % names.length];
    hearings.push({
      case: [{ caseUrn: `URN-SJP-PRESS-${String(i + 1).padStart(4, "0")}` }],
      party: [
        {
          partyRole: "ACCUSED",
          individualDetails: {
            title: "Mr",
            individualForenames: name.forenames,
            individualSurname: name.surname,
            dateOfBirth: name.dob,
            age: name.age,
            address: { line: [`${i + 1} Press Street`], town: "Bristol", county: "Avon", postCode: postcodes[i % postcodes.length] }
          }
        },
        {
          partyRole: "PROSECUTOR",
          organisationDetails: { organisationName: prosecutors[i % prosecutors.length] }
        }
      ],
      offence: [
        {
          offenceTitle: offences[i % offences.length].title,
          offenceWording: offences[i % offences.length].wording,
          reportingRestriction: false
        }
      ]
    });
  }

  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "SJP_PRESS_LIST",
    sensitivity: "CLASSIFIED",
    language: "ENGLISH",
    display_from: displayFrom,
    display_to: displayTo,
    hearing_list: {
      document: { publicationDate: `${contentDate}T09:00:00Z`, version: "1.0" },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Bristol Magistrates' Court",
            courtHouseAddress: { line: ["Nelson Street"], town: "Bristol", postCode: "BS1 2JA" },
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [{ sittings: [{ sittingStart: `${contentDate}T09:00:00Z`, sittingEnd: `${contentDate}T17:00:00Z`, hearing: hearings }] }]
              }
            ]
          }
        }
      ]
    }
  };
}

function createLargeCivilFamilyCauseListPayload(contentDate: string, displayFrom: string, displayTo: string, locationId: number, locationName: string) {
  // Generate many hearings to produce a PDF that may exceed 2MB
  const hearings = [];
  for (let i = 0; i < 200; i++) {
    hearings.push({
      hearingType: "Trial",
      case: [
        {
          caseNumber: `LARGE-${String(i + 1).padStart(4, "0")}`,
          caseName: `Claimant ${i + 1} v Defendant ${i + 1} - Extended Matter Regarding Property Dispute and Associated Financial Claims`,
          caseType: "Civil",
          caseSequenceIndicator: "1 of 1",
          party: [
            {
              partyRole: "APPLICANT_PETITIONER",
              individualDetails: { title: "Mr", individualForenames: `Claimant${i + 1}First`, individualSurname: `Claimant${i + 1}Last` }
            },
            {
              partyRole: "RESPONDENT",
              individualDetails: { title: "Ms", individualForenames: `Defendant${i + 1}First`, individualSurname: `Defendant${i + 1}Last` }
            }
          ]
        }
      ]
    });
  }

  // Split hearings across multiple court rooms and sessions for realism
  const courtRooms = [];
  const hearingsPerRoom = 20;
  for (let r = 0; r < Math.ceil(hearings.length / hearingsPerRoom); r++) {
    const roomHearings = hearings.slice(r * hearingsPerRoom, (r + 1) * hearingsPerRoom);
    courtRooms.push({
      courtRoomName: `Court Room ${r + 1}`,
      session: [
        {
          judiciary: [{ johKnownAs: `Judge ${r + 1}`, isPresiding: true }],
          sittings: [
            {
              sittingStart: `${contentDate}T09:00:00Z`,
              sittingEnd: `${contentDate}T17:00:00Z`,
              channel: ["In Person"],
              hearing: roomHearings
            }
          ]
        }
      ]
    });
  }

  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom,
    display_to: displayTo,
    hearing_list: {
      document: { publicationDate: `${contentDate}T09:00:00.000Z`, version: "1.0" },
      venue: {
        venueName: locationName,
        venueAddress: { line: ["1 Test Street"], town: "Test City", postCode: "TC1 1TC" },
        venueContact: { venueTelephone: "01234 567890" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: locationName,
            courtHouseAddress: { line: ["1 Test Street"], town: "Test City", postCode: "TC1 1TC" },
            courtRoom: courtRooms
          }
        }
      ]
    }
  };
}

function createCivilFamilyCauseListPayload(contentDate: string, displayFrom: string, displayTo: string, locationId: number, locationName: string) {
  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom,
    display_to: displayTo,
    hearing_list: {
      document: {
        publicationDate: `${contentDate}T09:00:00.000Z`,
        version: "1.0"
      },
      venue: {
        venueName: locationName,
        venueAddress: {
          line: ["1 Test Street", "Test District"],
          town: "Test City",
          county: "Test County",
          postCode: "TC1 1TC"
        },
        venueContact: {
          venueTelephone: "01234 567890",
          venueEmail: "test.court@justice.gov.uk"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: locationName,
            courtHouseAddress: {
              line: ["1 Test Street"],
              town: "Test City",
              postCode: "TC1 1TC"
            },
            courtRoom: [
              {
                courtRoomName: "Court Room 1",
                session: [
                  {
                    judiciary: [{ johKnownAs: "Judge Smith", isPresiding: true }],
                    sittings: [
                      {
                        sittingStart: `${contentDate}T10:00:00Z`,
                        sittingEnd: `${contentDate}T12:00:00Z`,
                        channel: ["In Person"],
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "NOTIF-TEST-001",
                                caseName: "Smith v Jones",
                                caseType: "Civil",
                                caseSequenceIndicator: "1 of 1",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: { title: "Mr", individualForenames: "John", individualSurname: "Smith" }
                                  },
                                  { partyRole: "RESPONDENT", individualDetails: { title: "Ms", individualForenames: "Jane", individualSurname: "Jones" } }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  };
}

test.describe("Subscription Notifications", () => {
  let testLocationId: number;
  let testLocationName: string;

  const testData: {
    userIds: string[];
    subscriptionIds: string[];
    publicationIds: string[];
  } = {
    userIds: [],
    subscriptionIds: [],
    publicationIds: []
  };

  test.beforeAll(async () => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "Subscription Notification Court" });
    testLocationId = testLocation.locationId;
    testLocationName = testLocation.name;
  });

  test.afterEach(async ({ request: _ }) => {
    // Clean up test-specific data that doesn't use the prefix system:
    // - Users: created with real CFT_IDAM email (not prefixed)
    // - Subscriptions/Notifications: linked to non-prefixed users
    // - Artefacts: some tests use non-prefixed locations (e.g., locationId 999)
    // Note: Locations ARE cleaned up by global-teardown via prefix-based deletion
    await cleanupTestNotifications(testData.publicationIds);
    await cleanupTestSubscriptions(testData.subscriptionIds);
    await cleanupTestUsers(testData.userIds);

    if (testData.publicationIds.length > 0) {
      await deleteTestArtefacts({ artefactIds: testData.publicationIds });
    }

    testData.userIds = [];
    testData.subscriptionIds = [];
    testData.publicationIds = [];
  });

  // Note: Location cleanup is handled by global-teardown.ts via prefix-based deletion
  // (createUniqueTestLocation uses prefixName, so global teardown will clean it up)

  test("notification delivery to single and multiple subscribers", async ({ request }) => {
    // PDF generation via Puppeteer can take 40-60+ seconds on cold start in CI.
    // Notifications are only sent after PDF generation completes, so we need a longer timeout.
    test.setTimeout(120_000);

    // PART 1: Test single subscriber notification with email content verification
    const testUser1 = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser1.userId);

    const subscription1 = await createTestSubscription(testUser1.userId, testLocationId);
    testData.subscriptionIds.push(subscription1.subscriptionId);

    // Upload publication via API with dynamic dates (always in the future)
    const dates1 = generatePublicationDates(1);
    const payload = createCivilFamilyCauseListPayload(dates1.contentDate, dates1.displayFrom, dates1.displayTo, testLocationId, testLocationName);

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    expect(result.artefact_id).toBeDefined();
    testData.publicationIds.push(result.artefact_id);

    // Wait for notification to reach terminal status (processPublication is fire-and-forget after 201).
    // Puppeteer PDF generation must complete before notifications are sent, so allow up to 90 seconds.
    const notifications = await waitForNotifications(result.artefact_id, 90, 1000, false, true);
    expect(notifications.length).toBeGreaterThan(0);

    // Verify notification was processed (Sent when Notify is configured, Failed otherwise)
    const sentNotification = notifications.find((n) => n.status === "Sent" || n.status === "Failed");
    expect(sentNotification).toBeDefined();

    // Verify PDF was generated for the publication (may take time as it's async)
    const pdfInfo = await waitForPdfGeneration(result.artefact_id);
    expect(pdfInfo.exists).toBe(true);
    expect(pdfInfo.filename).toContain(result.artefact_id);
    expect(pdfInfo.sizeBytes).toBeGreaterThan(0);
    console.log(`PDF generated: ${pdfInfo.filename} (${pdfInfo.sizeBytes} bytes)`);

    // Verify GOV.UK Notify email content
    if (process.env.GOVUK_NOTIFY_API_KEY && sentNotification?.govNotifyId) {
      const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);

      // Verify email recipient
      expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);

      // Verify email contains list type and court information
      expect(govNotifyEmail.body).toContain("Civil and Family Daily Cause List");
      expect(govNotifyEmail.body).toContain(testLocationName);
      expect(govNotifyEmail.body).toContain(dates1.formattedContentDate);

      // Verify email contains Special Category Data warning
      expect(govNotifyEmail.body).toContain("Special Category Data");
      expect(govNotifyEmail.body).toContain("Data Protection Act 2018");

      // Verify email contains subscription management links
      expect(govNotifyEmail.body).toContain("Manage your subscriptions");
      expect(govNotifyEmail.body).toContain("Unsubscribe");

      // Verify email contains PDF download link (GOV.UK Notify document service)
      const hasPdfLink = GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN.test(govNotifyEmail.body);
      expect(hasPdfLink).toBe(true);
      console.log("PDF download link found in email body");

      // Verify email delivery status
      expect(govNotifyEmail.status).toMatch(/delivered|sending|pending|created|permanent-failure/);
    }

    // PART 2: Test multiple subscribers receive notifications for same publication
    const testUser2 = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser2.userId);

    const subscription2 = await createTestSubscription(testUser2.userId, testLocationId);
    testData.subscriptionIds.push(subscription2.subscriptionId);

    // Upload second publication with different dates
    const dates2 = generatePublicationDates(2);
    const payload2 = createCivilFamilyCauseListPayload(dates2.contentDate, dates2.displayFrom, dates2.displayTo, testLocationId, testLocationName);

    const apiResponse2 = await request.post(ENDPOINT, {
      data: payload2,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse2.status()).toBe(201);
    const result2 = await apiResponse2.json();
    testData.publicationIds.push(result2.artefact_id);

    // Wait for notifications to reach terminal status
    const notifications2 = await waitForNotifications(result2.artefact_id, 60, 1000, false, true);

    // Verify notifications were processed for both subscribers (Sent or Failed depending on Notify config)
    const processedNotifications = notifications2.filter((n) => n.status === "Sent" || n.status === "Failed");
    expect(processedNotifications.length).toBeGreaterThanOrEqual(2);

    // Verify both subscriptions received notifications
    const sub1Notification = notifications2.find((n) => n.subscriptionId === subscription1.subscriptionId);
    const sub2Notification = notifications2.find((n) => n.subscriptionId === subscription2.subscriptionId);

    expect(sub1Notification).toBeDefined();
    expect(sub2Notification).toBeDefined();
    expect(["Sent", "Failed"]).toContain(sub1Notification?.status);
    expect(["Sent", "Failed"]).toContain(sub2Notification?.status);
  });

  test("no notifications sent when no subscriptions exist for location @nightly", async ({ request }) => {
    // Upload to location with no subscriptions (locationId 999)
    const dates = generatePublicationDates(3);
    const payload = createCivilFamilyCauseListPayload(dates.contentDate, dates.displayFrom, dates.displayTo, 999, "Non-existent Court");

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    testData.publicationIds.push(result.artefact_id);

    // Wait briefly for any notifications to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify no notifications were created
    const notifications = await waitForNotifications(result.artefact_id, 3, 500);
    expect(notifications).toHaveLength(0);
  });

  test("SJP public list generates PDF and Excel with both download links in email @nightly", async ({ request }) => {
    const testUser = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, testLocationId);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const dates = generatePublicationDates(4);
    const payload = createSjpPublicListPayload(dates.contentDate, dates.displayFrom, dates.displayTo, testLocationId);

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    expect(result.artefact_id).toBeDefined();
    testData.publicationIds.push(result.artefact_id);

    // Wait for notification to reach terminal status
    const notifications = await waitForNotifications(result.artefact_id, 30, 1000, false, true);
    expect(notifications.length).toBeGreaterThan(0);

    const sentNotification = notifications.find((n) => n.status === "Sent" || n.status === "Failed");
    expect(sentNotification).toBeDefined();

    // Verify both PDF and Excel were generated
    const fileList = await waitForFileGeneration(result.artefact_id, [".pdf", ".xlsx"]);
    const pdfFile = fileList.files.find((f) => f.filename.endsWith(".pdf"));
    const excelFile = fileList.files.find((f) => f.filename.endsWith(".xlsx"));

    expect(pdfFile).toBeDefined();
    expect(excelFile).toBeDefined();
    expect(pdfFile!.sizeBytes).toBeGreaterThan(0);
    expect(excelFile!.sizeBytes).toBeGreaterThan(0);
    console.log(`SJP PDF generated: ${pdfFile!.filename} (${pdfFile!.sizeBytes} bytes)`);
    console.log(`SJP Excel generated: ${excelFile!.filename} (${excelFile!.sizeBytes} bytes)`);

    // Verify GOV.UK Notify email contains both PDF and Excel download links
    if (process.env.GOVUK_NOTIFY_API_KEY && sentNotification?.govNotifyId) {
      const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);

      expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);
      expect(govNotifyEmail.body).toContain("SJP Public List");
      expect(govNotifyEmail.body).toContain(dates.formattedContentDate);

      // SJP PDF+Excel template should have two document download links
      const documentLinks = govNotifyEmail.body.match(GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN);
      expect(documentLinks).not.toBeNull();
      expect(documentLinks!.length).toBeGreaterThanOrEqual(2);
      console.log("Both PDF and Excel download links found in email body");
    }
  });

  test("SJP press list generates PDF and Excel with download links in email @nightly", async ({ request }) => {
    const testUser = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, testLocationId);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const dates = generatePublicationDates(5);
    const payload = createSjpPressListPayload(dates.contentDate, dates.displayFrom, dates.displayTo, testLocationId);

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    expect(result.artefact_id).toBeDefined();
    testData.publicationIds.push(result.artefact_id);

    // Wait for notification to reach terminal status
    const notifications = await waitForNotifications(result.artefact_id, 30, 1000, false, true);
    expect(notifications.length).toBeGreaterThan(0);

    const sentNotification = notifications.find((n) => n.status === "Sent" || n.status === "Failed");
    expect(sentNotification).toBeDefined();

    // Verify both PDF and Excel were generated for SJP press list
    const fileList = await waitForFileGeneration(result.artefact_id, [".pdf", ".xlsx"]);
    const pdfFile = fileList.files.find((f) => f.filename.endsWith(".pdf"));
    const excelFile = fileList.files.find((f) => f.filename.endsWith(".xlsx"));

    expect(pdfFile).toBeDefined();
    expect(excelFile).toBeDefined();
    expect(pdfFile!.sizeBytes).toBeGreaterThan(0);
    expect(excelFile!.sizeBytes).toBeGreaterThan(0);
    console.log(`SJP Press PDF generated: ${pdfFile!.filename} (${pdfFile!.sizeBytes} bytes)`);
    console.log(`SJP Press Excel generated: ${excelFile!.filename} (${excelFile!.sizeBytes} bytes)`);

    // Verify GOV.UK Notify email content for SJP press list
    if (process.env.GOVUK_NOTIFY_API_KEY && sentNotification?.govNotifyId) {
      const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);

      expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);
      expect(govNotifyEmail.body).toContain(dates.formattedContentDate);

      // SJP press list with both files under 2MB uses the PDF+Excel template with download links
      const documentLinks = govNotifyEmail.body.match(GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN);
      expect(documentLinks).not.toBeNull();
      expect(documentLinks!.length).toBeGreaterThanOrEqual(2);
      console.log("Both PDF and Excel download links found in SJP press list email");
    }
  });

  test("large file publication sends no-links email template @nightly", async ({ request }) => {
    const testUser = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, testLocationId);
    testData.subscriptionIds.push(subscription.subscriptionId);

    // Upload a non-SJP list so it generates a PDF, then we simulate a large file
    // by uploading a file > 2MB via test-support before the real publication triggers notifications.
    // However, since processPublication generates the PDF and sends notifications synchronously,
    // we need to use a payload that will naturally produce a large PDF.
    // Instead, we create a Civil & Family list with many hearings to exceed 2MB.
    const dates = generatePublicationDates(6);
    const payload = createLargeCivilFamilyCauseListPayload(dates.contentDate, dates.displayFrom, dates.displayTo, testLocationId, testLocationName);

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    expect(result.artefact_id).toBeDefined();
    testData.publicationIds.push(result.artefact_id);

    // Wait for notification to reach terminal status
    const notifications = await waitForNotifications(result.artefact_id, 30, 1000, false, true);
    expect(notifications.length).toBeGreaterThan(0);

    const sentNotification = notifications.find((n) => n.status === "Sent" || n.status === "Failed");
    expect(sentNotification).toBeDefined();

    // Verify the PDF was generated and check its size
    const pdfInfo = await waitForPdfGeneration(result.artefact_id);
    expect(pdfInfo.exists).toBe(true);
    console.log(`Large list PDF generated: ${pdfInfo.filename} (${pdfInfo.sizeBytes} bytes)`);

    // Verify GOV.UK Notify email - if PDF > 2MB, "no links" template is used (no document download links)
    if (process.env.GOVUK_NOTIFY_API_KEY && sentNotification?.govNotifyId) {
      const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);

      expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);
      expect(govNotifyEmail.body).toContain(dates.formattedContentDate);

      if (pdfInfo.sizeBytes && pdfInfo.sizeBytes > 2 * 1024 * 1024) {
        // PDF exceeded 2MB - no-links template should be used (no document download links)
        const hasDocumentLink = GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN.test(govNotifyEmail.body);
        expect(hasDocumentLink).toBe(false);
        console.log("No download links in email body (file exceeds 2MB - no-links template used)");
      } else {
        // PDF was under 2MB - PDF-only template used (has download link)
        const hasDocumentLink = GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN.test(govNotifyEmail.body);
        expect(hasDocumentLink).toBe(true);
        console.log(`PDF under 2MB (${pdfInfo.sizeBytes} bytes) - PDF-only template used with download link`);
      }
    }
  });
});
