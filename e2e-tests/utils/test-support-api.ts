import { getApiAuthToken } from "./api-auth-helpers.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";

interface CreateLocationInput {
  locationId?: number;
  name: string;
  welshName: string;
  email?: string;
  contactNo?: string;
  regionIds?: number[];
  subJurisdictionIds?: number[];
}

interface CreateLocationResponse {
  locationId: number;
  name: string;
  welshName: string;
}

interface CreateUserInput {
  email: string;
  firstName: string;
  surname: string;
  userProvenance?: string;
  userProvenanceId?: string;
  role?: string;
}

interface CreateUserResponse {
  userId: string;
  email: string;
  firstName: string;
  surname: string;
}

interface CreateSubscriptionInput {
  userId: string;
  searchType: string;
  searchValue: string;
}

interface CreateSubscriptionResponse {
  subscriptionId: string;
  userId: string;
  searchType: string;
  searchValue: string;
}

interface CreateArtefactInput {
  locationId: string;
  listTypeId: number;
  contentDate: string;
  sensitivity?: string;
  language?: string;
  displayFrom?: string;
  displayTo?: string;
  isFlatFile?: boolean;
  provenance?: string;
}

interface CreateArtefactResponse {
  artefactId: string;
  locationId: string;
  listTypeId: number;
}

async function callTestSupportApi<T>(method: "GET" | "POST" | "DELETE", endpoint: string, data?: unknown): Promise<T> {
  const token = await getApiAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: data ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API call failed: ${response.status} ${error}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function createTestLocation(data: CreateLocationInput): Promise<CreateLocationResponse> {
  return callTestSupportApi<CreateLocationResponse>("POST", "/test-support/locations", data);
}

export async function deleteTestLocation(locationId: number): Promise<void> {
  return callTestSupportApi<void>("DELETE", `/test-support/locations/${locationId}`);
}

export async function createTestUser(data: CreateUserInput): Promise<CreateUserResponse> {
  return callTestSupportApi<CreateUserResponse>("POST", "/test-support/users", data);
}

export async function deleteTestUser(userId: string): Promise<void> {
  return callTestSupportApi<void>("DELETE", `/test-support/users/${userId}`);
}

export async function createTestSubscription(data: CreateSubscriptionInput): Promise<CreateSubscriptionResponse> {
  return callTestSupportApi<CreateSubscriptionResponse>("POST", "/test-support/subscriptions", data);
}

export async function createTestArtefact(data: CreateArtefactInput): Promise<CreateArtefactResponse> {
  return callTestSupportApi<CreateArtefactResponse>("POST", "/test-support/artefacts", data);
}

export async function getTestArtefacts(params?: { locationId?: string; provenance?: string }): Promise<unknown[]> {
  const queryParams = new URLSearchParams();
  if (params?.locationId) queryParams.append("locationId", params.locationId);
  if (params?.provenance) queryParams.append("provenance", params.provenance);
  const query = queryParams.toString();
  return callTestSupportApi<unknown[]>("GET", `/test-support/artefacts${query ? `?${query}` : ""}`);
}

export async function deleteTestArtefact(artefactId: string): Promise<void> {
  return callTestSupportApi<void>("DELETE", `/test-support/artefacts/${artefactId}`);
}

export async function deleteTestArtefacts(params: { locationId?: string; provenance?: string; artefactIds?: string[] }): Promise<{ deleted: number }> {
  return callTestSupportApi<{ deleted: number }>("DELETE", "/test-support/artefacts", params);
}

export async function getTestSubscriptions(params?: { userId?: string; searchType?: string; searchValue?: string }): Promise<unknown[]> {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.append("userId", params.userId);
  if (params?.searchType) queryParams.append("searchType", params.searchType);
  if (params?.searchValue) queryParams.append("searchValue", params.searchValue);
  const query = queryParams.toString();
  return callTestSupportApi<unknown[]>("GET", `/test-support/subscriptions${query ? `?${query}` : ""}`);
}

export async function deleteTestSubscriptions(params: { userId?: string; searchType?: string; searchValues?: string[] }): Promise<{ deleted: number }> {
  return callTestSupportApi<{ deleted: number }>("DELETE", "/test-support/subscriptions", params);
}

export async function getFirstTestLocation(): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", "/test-support/locations?first=true");
}

export async function deleteTestLocations(locationIds: number[]): Promise<{ deleted: number }> {
  return callTestSupportApi<{ deleted: number }>("DELETE", "/test-support/locations", { locationIds });
}

// Media Applications
interface CreateMediaApplicationInput {
  name: string;
  email: string;
  employer: string;
  status?: string;
  proofOfIdPath?: string | null;
}

export async function createTestMediaApplication(data: CreateMediaApplicationInput): Promise<unknown> {
  return callTestSupportApi<unknown>("POST", "/test-support/media-applications", data);
}

export async function getTestMediaApplication(id: string): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", `/test-support/media-applications/${id}`);
}

export async function getTestMediaApplicationByEmail(email: string): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", `/test-support/media-applications?email=${encodeURIComponent(email)}`);
}

export async function deleteTestMediaApplication(id: string): Promise<void> {
  return callTestSupportApi<void>("DELETE", `/test-support/media-applications/${id}`);
}

// Reference Data
export async function getFirstRegion(): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", "/test-support/regions?first=true");
}

export async function getFirstSubJurisdiction(): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", "/test-support/sub-jurisdictions?first=true");
}

export async function getListType(id: number): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", `/test-support/list-types?id=${id}`);
}

export async function getListTypeByName(name: string): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", `/test-support/list-types?name=${encodeURIComponent(name)}`);
}

export async function getFirstListType(): Promise<unknown> {
  return callTestSupportApi<unknown>("GET", "/test-support/list-types?first=true");
}

// Health check
interface HealthCheckResponse {
  status: string;
  database: string;
  migrations: string;
  error?: string;
}

export async function checkTestSupportHealth(): Promise<HealthCheckResponse> {
  const url = `${API_BASE_URL}/test-support/health`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

// Jurisdictions
interface JurisdictionInput {
  jurisdictionId: number;
  name: string;
  welshName?: string;
}

export async function seedJurisdictions(jurisdictions: JurisdictionInput[]): Promise<{ seeded: number }> {
  return callTestSupportApi<{ seeded: number }>("POST", "/test-support/jurisdictions", { jurisdictions });
}

export async function getJurisdictions(): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", "/test-support/jurisdictions");
}

// Sub-jurisdictions
interface SubJurisdictionInput {
  subJurisdictionId: number;
  name: string;
  welshName?: string;
  jurisdictionId: number;
}

export async function seedSubJurisdictions(subJurisdictions: SubJurisdictionInput[]): Promise<{ seeded: number }> {
  return callTestSupportApi<{ seeded: number }>("POST", "/test-support/sub-jurisdictions", { subJurisdictions });
}

export async function getSubJurisdictions(): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", "/test-support/sub-jurisdictions");
}

// Regions
interface RegionInput {
  regionId: number;
  name: string;
  welshName?: string;
}

export async function seedRegions(regions: RegionInput[]): Promise<{ seeded: number }> {
  return callTestSupportApi<{ seeded: number }>("POST", "/test-support/regions", { regions });
}

export async function getRegions(): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", "/test-support/regions");
}

// List types
interface ListTypeInput {
  name: string;
  friendlyName?: string;
  welshFriendlyName?: string;
  shortenedFriendlyName?: string;
  url?: string;
  defaultSensitivity?: string;
  provenance?: string;
  isNonStrategic?: boolean;
}

export async function seedListTypes(listTypes: ListTypeInput[], linkAllSubJurisdictions = false): Promise<{ seeded: number }> {
  return callTestSupportApi<{ seeded: number }>("POST", "/test-support/list-types", {
    listTypes,
    linkAllSubJurisdictions
  });
}

export async function getListTypes(): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", "/test-support/list-types");
}

// Locations
export async function getTestLocations(): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", "/test-support/locations");
}

// Artefacts - get all for state tracking
export async function getAllTestArtefacts(): Promise<{ artefactId: string }[]> {
  return callTestSupportApi<{ artefactId: string }[]>("GET", "/test-support/artefacts");
}

// Bulk location seeding with relationships by name
interface SeedLocationInput {
  locationId: number;
  locationName: string;
  welshLocationName?: string;
  email?: string;
  contactNo?: string;
  subJurisdictionNames?: string[];
  regionNames?: string[];
}

export async function seedLocationsFromCsv(locations: SeedLocationInput[]): Promise<{ seeded: number }> {
  return callTestSupportApi<{ seeded: number }>("POST", "/test-support/seed-locations", { locations });
}

// Verification helpers
export async function getLocationsWithRelationships(): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", "/test-support/locations?includeRelationships=true");
}

export async function getArtefactsByLocation(locationId: string): Promise<unknown[]> {
  return callTestSupportApi<unknown[]>("GET", `/test-support/artefacts?locationId=${locationId}`);
}

// Cleanup by prefix
interface CleanupResponse {
  prefix: string;
  deleted: number;
  details: {
    artefacts: number;
    subscriptions: number;
    users: number;
    locations: number;
    listTypes: number;
    mediaApplications: number;
  };
}

export async function cleanupTestDataByPrefix(prefix: string): Promise<CleanupResponse> {
  return callTestSupportApi<CleanupResponse>("DELETE", "/test-support/cleanup", { prefix });
}

// Create list type and return the created record with ID
interface CreateListTypeInput {
  name: string;
  friendlyName: string;
  welshFriendlyName?: string;
  url?: string;
  defaultSensitivity?: string;
  provenance?: string;
  isNonStrategic?: boolean;
}

interface ListTypeRecord {
  listTypeId: number;
  id: number;
  listTypeName: string;
  name: string;
  friendlyName: string;
  welshFriendlyName: string;
  url: string;
  defaultSensitivity: string;
  allowedProvenance: string;
  isNonStrategic: boolean;
}

// Notifications
export interface NotificationRecord {
  notificationId: string;
  subscriptionId: string;
  userId: string;
  publicationId: string;
  govNotifyId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export async function getNotificationsByPublicationId(publicationId: string): Promise<NotificationRecord[]> {
  return callTestSupportApi<NotificationRecord[]>("GET", `/test-support/notifications?publicationId=${publicationId}`);
}

export async function getNotificationsBySubscriptionId(subscriptionId: string): Promise<NotificationRecord[]> {
  return callTestSupportApi<NotificationRecord[]>("GET", `/test-support/notifications?subscriptionId=${subscriptionId}`);
}

export async function deleteTestNotifications(params: { publicationIds?: string[]; subscriptionIds?: string[] }): Promise<{ deleted: number }> {
  return callTestSupportApi<{ deleted: number }>("DELETE", "/test-support/notifications", params);
}

// Batch delete users
export async function deleteTestUsers(userIds: string[]): Promise<{ deleted: number }> {
  return callTestSupportApi<{ deleted: number }>("DELETE", "/test-support/users", { userIds });
}

export async function createOrGetListType(input: CreateListTypeInput): Promise<ListTypeRecord> {
  // First try to find existing list type by name
  try {
    const existing = (await getListTypeByName(input.name)) as ListTypeRecord;
    if (existing?.id) {
      // Map 'id' to 'listTypeId' for backwards compatibility
      return { ...existing, listTypeId: existing.id };
    }
  } catch {
    // Not found, will create
  }

  // Create new list type
  const result = await seedListTypes(
    [
      {
        name: input.name,
        friendlyName: input.friendlyName,
        welshFriendlyName: input.welshFriendlyName || input.friendlyName,
        url: input.url || "",
        defaultSensitivity: input.defaultSensitivity || "Public",
        provenance: input.provenance || "MANUAL_UPLOAD",
        isNonStrategic: input.isNonStrategic ?? false
      }
    ],
    true
  );

  if (result.seeded === 0) {
    throw new Error(`Failed to create list type: ${input.name}`);
  }

  // Fetch the created list type to get its ID
  const created = (await getListTypeByName(input.name)) as ListTypeRecord;
  // Map 'id' to 'listTypeId' for backwards compatibility
  return { ...created, listTypeId: created.id };
}
