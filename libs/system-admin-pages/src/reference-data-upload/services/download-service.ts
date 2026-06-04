import { prisma } from "@hmcts/postgres-prisma";
import Papa from "papaparse";

export async function generateReferenceDataCsv(): Promise<string> {
  try {
    const locations = await prisma.location.findMany({
      orderBy: {
        locationId: "asc"
      },
      select: {
        locationId: true,
        name: true,
        welshName: true,
        email: true,
        contactNo: true,
        locationRegions: {
          select: {
            region: {
              select: {
                name: true
              }
            }
          }
        },
        locationSubJurisdictions: {
          select: {
            subJurisdiction: {
              select: {
                name: true
              }
            }
          }
        },
        locationReferences: true
      }
    });

    const csvData = locations.map((location) => {
      const subJurisdictionNames = location.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.name).join(";");

      const regionNames = location.locationRegions.map((lr) => lr.region.name).join(";");

      const provenances = location.locationReferences.map((lr: any) => lr.provenance).join(";");
      const provenanceLocationIds = location.locationReferences.map((lr: any) => lr.provenanceLocationId).join(";");
      const provenanceLocationTypes = location.locationReferences.map((lr: any) => lr.provenanceLocationType).join(";");

      return {
        LOCATION_ID: location.locationId,
        LOCATION_NAME: location.name,
        WELSH_LOCATION_NAME: location.welshName,
        EMAIL: location.email || "",
        CONTACT_NO: location.contactNo || "",
        SUB_JURISDICTION_NAME: subJurisdictionNames,
        REGION_NAME: regionNames,
        PROVENANCE: provenances,
        PROVENANCE_LOCATION_ID: provenanceLocationIds,
        PROVENANCE_LOCATION_TYPE: provenanceLocationTypes
      };
    });

    return Papa.unparse(csvData, {
      header: true
    });
  } catch (error) {
    console.error("generateReferenceDataCsv failed:", error);
    throw new Error(`Failed to generate reference data CSV: ${error instanceof Error ? error.message : String(error)}`);
  }
}
