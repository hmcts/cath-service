import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));
const TIMEZONE = "Europe/London";
const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadManifest(): Promise<Manifest> {
  return JSON.parse(await readFile(path.join(FIXTURES_DIR, "publications.json"), "utf-8"));
}

export async function loadUsers(): Promise<ParityUser[]> {
  return (JSON.parse(await readFile(path.join(FIXTURES_DIR, "users.json"), "utf-8")) as { users: ParityUser[] }).users;
}

export async function readPayload(publication: PublicationFixture): Promise<Buffer> {
  return readFile(path.join(FIXTURES_DIR, publication.payload));
}

// Both apps receive identical metadata. Times are London wall-clock with no offset, which is
// how pip's x-* headers are interpreted, so the apps' own server timezones cannot shift them.
export function publicationMetadata(publication: PublicationFixture, manifest: Manifest, seededAt: Date): PublicationMetadata {
  return {
    contentDate: `${publication.contentDate}T00:00:00`,
    displayFrom: londonDateTime(new Date(seededAt.getTime() - manifest.displayWindowDays.before * DAY_MS)),
    displayTo: londonDateTime(new Date(seededAt.getTime() + manifest.displayWindowDays.after * DAY_MS)),
    type: publication.type,
    language: publication.language,
    sensitivity: publication.sensitivity,
    provenance: publication.provenance
  };
}

function londonDateTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export interface Manifest {
  $comment?: string;
  generatedFrom?: Record<string, string>;
  displayWindowDays: { before: number; after: number };
  publications: PublicationFixture[];
  unmatched?: { listType: string; reason: string }[];
}

export interface PublicationFixture {
  id: string;
  listType: string;
  // CaTH's name for the list type where it differs from pip's; null when CaTH has no equivalent
  cathListType: string | null;
  // null when that app has no page for this list type
  paths: { pip: string; cath: string | null };
  payload: string;
  // json: posted as the publication body. excel: a non-strategic list, uploaded as a spreadsheet.
  // flat-file: a list type pip only publishes as an uploaded document, shown as the file itself
  format: "json" | "excel" | "flat-file";
  origin: string;
  locationId: number;
  contentDate: string;
  type: string;
  language: string;
  sensitivity: string;
  provenance: string;
  // The parity user (users.json) the page must be captured as; absent for public publications
  viewAs?: string;
  notes?: string[];
}

export interface ParityUser {
  id: string;
  provenance: "PI_AAD" | "CFT_IDAM" | "CRIME_IDAM" | "SSO";
  role: string;
  provenanceUserId: string;
  email: string;
  forenames: string;
  surname: string;
}

export interface PublicationMetadata {
  contentDate: string;
  displayFrom: string;
  displayTo: string;
  type: string;
  language: string;
  sensitivity: string;
  provenance: string;
}

export interface SeedResult {
  app: string;
  seededAt: string;
  ingestion: string;
  publications: Record<string, { artefactId: string; locationId: number; metadata: PublicationMetadata }>;
  // Publications the app refused, with its reason; a finding in its own right
  rejected: Record<string, string>;
  // Account-side records from records.json, keyed by record id
  records?: Record<string, Record<string, string>>;
  // Each fixture user's id in the app, keyed by fixture user id
  users?: Record<string, string>;
}
