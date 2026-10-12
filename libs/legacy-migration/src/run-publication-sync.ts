import { locationData } from "@hmcts/location";
import { type Prisma, prisma } from "@hmcts/postgres-prisma";
import { buildDerivedData } from "./artefact-derived-data.js";
import { deleteRemovedArtefactFiles, stageArtefactPayloads } from "./artefact-payload.js";
import { type ArtefactWritePlan, planArtefactWrites } from "./artefact-plan.js";
import { type MigratedArtefact, transformArtefacts } from "./artefact-transform.js";
import { readLegacyPublicationData } from "./legacy-publication-source.js";
import { createLegacyStorageReader } from "./legacy-storage-source.js";
import { type MigratedListSearchConfig, transformListSearchConfigs } from "./list-search-config-transform.js";
import { findLocationDrift } from "./location-drift.js";
import { type MigratedLocationMetadata, transformLocationMetadata } from "./location-metadata-transform.js";
import { findDropLimitViolation } from "./row-count-guard.js";
import type { DomainReport, DomainTransform, StepReport, SyncReport } from "./sync-report.js";

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10 * 60_000 };

// Displayable artefacts churn daily, and the set shrinks sharply over weekends and holidays
// as lists expire with few new ones published. A truncated or empty read is still caught,
// because a populated table is never emptied.
const ARTEFACT_MIN_DROP_RATIO = 0.5;

const ARTEFACT_FIELDS = {
  artefactId: true,
  type: true,
  locationId: true,
  listTypeId: true,
  contentDate: true,
  sensitivity: true,
  language: true,
  displayFrom: true,
  displayTo: true,
  lastReceivedDate: true,
  isFlatFile: true,
  provenance: true,
  supersededCount: true,
  sourceArtefactId: true
} as const;

export async function runPublicationSync(options: PublicationSyncOptions): Promise<SyncReport> {
  const { legacyPublicationDatabaseUrl, isDryRun, maxDropRatio } = options;
  const legacy = await readLegacyPublicationData(legacyPublicationDatabaseUrl);
  const { listTypes, listTypeIdByName, locationIds } = await readReferenceData();

  const locationMetadata = transformLocationMetadata(legacy.locationMetadata, { locationIds });
  const listSearchConfigs = transformListSearchConfigs(legacy.listSearchConfigs, { listTypeIdByName });
  const artefacts = transformArtefacts(legacy.artefacts, { listTypeIdByName, locationIds });
  const existing: MigratedArtefact[] = await prisma.artefact.findMany({ select: ARTEFACT_FIELDS });
  const storage = createLegacyStorageReader();
  const staged = await stageArtefactPayloads(artefacts.rows, new Map(existing.map((artefact) => [artefact.artefactId, artefact])), storage, isDryRun);
  const artefactDomain: DomainTransform<MigratedArtefact> = { rows: staged.rows, rejections: [...artefacts.rejections, ...staged.rejections] };
  const plan = planArtefactWrites(staged.rows, existing);

  const domains = await prisma.$transaction(async (tx) => {
    const reports = [
      buildReport("location_metadata", legacy.locationMetadata.length, await tx.locationMetadata.count(), locationMetadata, maxDropRatio),
      buildReport("list_search_config", legacy.listSearchConfigs.length, await tx.listSearchConfig.count(), listSearchConfigs, maxDropRatio),
      buildReport("artefact", legacy.artefacts.length, existing.length, artefactDomain, Math.max(maxDropRatio, ARTEFACT_MIN_DROP_RATIO))
    ];

    if (!isDryRun) {
      const violations = reports.flatMap((report) => (report.dropLimitViolation ? [report.dropLimitViolation] : []));
      if (violations.length > 0) {
        throw new Error(violations.join("\n"));
      }
      await writePublicationData(tx, locationMetadata.rows, listSearchConfigs.rows, plan);
    }

    return reports;
  }, TRANSACTION_OPTIONS);

  const steps: StepReport[] = [{ name: "location_drift", processed: legacy.locations.length, rejections: findLocationDrift(legacy.locations, locationData) }];

  if (isDryRun) {
    steps.push({ name: "artefact_derived_data", processed: 0, rejections: [], skipped: `dry run; ${staged.changed.length} artefacts would be rebuilt` });
  } else {
    await deleteRemovedArtefactFiles(plan.deletes);
    steps.push(await buildDerivedData(staged.changed, listTypes, storage));
  }

  return { isDryRun, domains, steps };
}

async function readReferenceData() {
  const listTypes = await prisma.listType.findMany({ where: { deletedAt: null }, select: { id: true, name: true, friendlyName: true } });
  const locations = await prisma.location.findMany({ select: { locationId: true } });

  return {
    listTypes,
    listTypeIdByName: new Map(listTypes.map((listType) => [listType.name, listType.id])),
    locationIds: new Set(locations.map((location) => String(location.locationId)))
  };
}

function buildReport<T>(entityType: string, read: number, existing: number, transform: DomainTransform<T>, maxDropRatio: number): DomainReport {
  const loaded = transform.rows.length;
  return {
    entityType,
    read,
    existing,
    loaded,
    rejections: transform.rejections,
    dropLimitViolation: findDropLimitViolation(entityType, existing, loaded, maxDropRatio)
  };
}

// Deleting an artefact cascades to artefact_search and nulls ingestion_log.artefact_id.
async function writePublicationData(
  tx: Prisma.TransactionClient,
  locationMetadata: MigratedLocationMetadata[],
  listSearchConfigs: MigratedListSearchConfig[],
  plan: ArtefactWritePlan
): Promise<void> {
  await tx.locationMetadata.deleteMany();
  await tx.locationMetadata.createMany({ data: locationMetadata });
  await tx.listSearchConfig.deleteMany();
  await tx.listSearchConfig.createMany({ data: listSearchConfigs });

  if (plan.deletes.length > 0) {
    await tx.artefact.deleteMany({ where: { artefactId: { in: plan.deletes } } });
  }
  await tx.artefact.createMany({ data: plan.inserts });
  for (const artefact of plan.updates) {
    await tx.artefact.update({ where: { artefactId: artefact.artefactId }, data: artefact });
  }
}

export interface PublicationSyncOptions {
  legacyPublicationDatabaseUrl: string;
  isDryRun: boolean;
  maxDropRatio: number;
}
