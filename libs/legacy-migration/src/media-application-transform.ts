import path from "node:path";
import type { LegacyMediaApplication } from "./legacy-account-source.js";
import type { DomainTransform, Rejection } from "./sync-report.js";
import { normaliseEmail } from "./value-mapping.js";

// The file types the new media application upload accepts.
const PROOF_OF_ID_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

export function transformMediaApplications(legacyApplications: LegacyMediaApplication[]): DomainTransform<MediaApplicationLoad> {
  const rejections: Rejection[] = [];
  const rows: MediaApplicationLoad[] = [];

  for (const legacy of legacyApplications) {
    const result = transformMediaApplication(legacy);
    if (result.ok) {
      rows.push(result.load);
    } else {
      rejections.push({ entityId: legacy.id, reason: result.reason });
    }
  }

  return { rows, rejections };
}

function transformMediaApplication(legacy: LegacyMediaApplication): TransformResult {
  const email = normaliseEmail(legacy.email);
  const name = legacy.full_name?.trim();
  const employer = legacy.employer?.trim();

  if (!name || !email || !employer) {
    return { ok: false, reason: "missing name, email or employer" };
  }

  if (!legacy.image || !legacy.image_name) {
    return { ok: false, reason: "missing proof of ID" };
  }

  const extension = path.extname(legacy.image_name).toLowerCase();
  if (!PROOF_OF_ID_EXTENSIONS.has(extension)) {
    return { ok: false, reason: `unsupported proof of ID type ${extension || "(none)"}` };
  }

  return {
    ok: true,
    load: {
      application: {
        id: legacy.id,
        name,
        email,
        employer,
        // Same key the new upload writes, so the admin proof-of-ID page finds it.
        proofOfIdPath: `${legacy.id}${extension}`,
        proofOfIdOriginalName: legacy.image_name,
        status: "PENDING",
        appliedDate: legacy.request_date ?? new Date(0)
      },
      proofOfIdSourceBlob: legacy.image
    }
  };
}

export interface MigratedMediaApplication {
  id: string;
  name: string;
  email: string;
  employer: string;
  proofOfIdPath: string;
  proofOfIdOriginalName: string;
  status: string;
  appliedDate: Date;
}

export interface MediaApplicationLoad {
  application: MigratedMediaApplication;
  proofOfIdSourceBlob: string;
}

type TransformResult = { ok: true; load: MediaApplicationLoad } | { ok: false; reason: string };
