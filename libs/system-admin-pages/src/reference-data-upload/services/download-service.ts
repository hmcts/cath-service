import { prisma } from "@hmcts/postgres-prisma";
import Papa from "papaparse";

export async function generateReferenceDataCsv(): Promise<string> {
  try {
    const locations = await prisma.location.findMany({
      include: {
        locationRegions: {
          include: {
            region: true
          }
        },
        locationSubJurisdictions: {
          include: {
            subJurisdiction: true
          }
        },
        locationReferences: true
      },
      orderBy: {
        locationId: "asc"
      }
    });

    const csvData = locations.map((location: any) => {
      const subJurisdictionNames = location.locationSubJurisdictions.map((lsj: any) => lsj.subJurisdiction.name).join(";");

      const regionNames = location.locationRegions.map((lr: any) => lr.region.name).join(";");

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
