import { prisma } from "@hmcts/postgres";
import Papa from "papaparse";

export async function generateReferenceDataCsv(): Promise<string> {
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
      }
    },
    orderBy: {
      locationId: "asc"
    }
  });

  const csvData = locations.map((location) => {
    const subJurisdictionNames = location.locationSubJurisdictions
      .map((lsj) => lsj.subJurisdiction.name)
      .join(";");

    const regionNames = location.locationRegions
      .map((lr) => lr.region.name)
      .join(";");

    return {
      LOCATION_ID: location.locationId,
      LOCATION_NAME: location.name,
      WELSH_LOCATION_NAME: location.welshName,
      EMAIL: location.email || "",
      CONTACT_NO: location.contactNo || "",
      SUB_JURISDICTION_NAME: subJurisdictionNames,
      REGION_NAME: regionNames
    };
  });

  return Papa.unparse(csvData, {
    header: true
  });
}
