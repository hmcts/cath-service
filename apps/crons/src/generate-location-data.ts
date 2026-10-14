import { buildLocationDataCandidate } from "@hmcts/legacy-migration";

// One-off: prints a location-data.ts candidate built from legacy to stdout for a reviewed PR,
// and the issues to stderr. Reads legacy only; writes nothing.
export const generateLocationDataCandidate = async () => {
  const legacyPublicationDatabaseUrl = process.env.LEGACY_PUBLICATION_DATABASE_URL;
  if (!legacyPublicationDatabaseUrl) {
    throw new Error("LEGACY_PUBLICATION_DATABASE_URL is required");
  }

  const { source, issues } = await buildLocationDataCandidate(legacyPublicationDatabaseUrl);

  process.stdout.write(source);
  for (const issue of issues) {
    console.error(`location ${issue.entityId}: ${issue.reason}`);
  }
};

export default generateLocationDataCandidate;
