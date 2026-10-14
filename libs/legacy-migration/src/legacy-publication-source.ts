import pg from "pg";

export async function readLegacyPublicationData(connectionString: string): Promise<LegacyPublicationData> {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // Same snapshot and UTC handling as the account reader (see legacy-account-source.ts).
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

    const locations = await client.query<LegacyLocation>("SELECT location_id, name, welsh_name, region, jurisdiction_type FROM location");
    const locationMetadata = await client.query<LegacyLocationMetadata>(
      `SELECT location_metadata_id, location_id, caution_message, welsh_caution_message, no_list_message, welsh_no_list_message
         FROM location_metadata`
    );
    const listSearchConfigs = await client.query<LegacyListSearchConfig>(
      "SELECT id, list_type, case_number_field_name, case_name_field_name FROM list_search_config"
    );
    // Expired artefacts are about to be archived by legacy, so only displayable ones are read.
    const artefacts = await client.query<LegacyArtefact>(
      `SELECT artefact_id, provenance, source_artefact_id, type, sensitivity, language, list_type, location_id,
              is_flat_file, payload, superseded_count,
              display_from AT TIME ZONE 'UTC' AS display_from,
              display_to AT TIME ZONE 'UTC' AS display_to,
              content_date AT TIME ZONE 'UTC' AS content_date,
              last_received_date AT TIME ZONE 'UTC' AS last_received_date
         FROM artefact
        WHERE display_to IS NULL OR display_to > (now() AT TIME ZONE 'UTC')`
    );

    await client.query("COMMIT");

    return {
      locations: locations.rows,
      locationMetadata: locationMetadata.rows,
      listSearchConfigs: listSearchConfigs.rows,
      artefacts: artefacts.rows
    };
  } finally {
    await client.end();
  }
}

export interface LegacyLocation {
  location_id: number;
  name: string | null;
  welsh_name: string | null;
  region: string[] | null;
  jurisdiction_type: string[] | null;
}

export interface LegacyLocationMetadata {
  location_metadata_id: string;
  location_id: number | null;
  caution_message: string | null;
  welsh_caution_message: string | null;
  no_list_message: string | null;
  welsh_no_list_message: string | null;
}

// Admin-managed in both systems: which payload fields hold case numbers and names for search.
export interface LegacyListSearchConfig {
  id: string;
  list_type: string | null;
  case_number_field_name: string | null;
  case_name_field_name: string | null;
}

export interface LegacyArtefact {
  artefact_id: string;
  provenance: string | null;
  source_artefact_id: string | null;
  type: string | null;
  sensitivity: string | null;
  language: string | null;
  list_type: string | null;
  // The internal location id as a string, or NoMatch<source id>.
  location_id: string | null;
  is_flat_file: boolean | null;
  // Full blob URL in the legacy artefact container; the blob name is the last segment.
  payload: string | null;
  superseded_count: number | null;
  display_from: Date | null;
  display_to: Date | null;
  content_date: Date | null;
  last_received_date: Date | null;
}

export interface LegacyPublicationData {
  locations: LegacyLocation[];
  locationMetadata: LegacyLocationMetadata[];
  listSearchConfigs: LegacyListSearchConfig[];
  artefacts: LegacyArtefact[];
}
