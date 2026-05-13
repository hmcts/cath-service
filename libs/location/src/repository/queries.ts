import { prisma } from "@hmcts/postgres-prisma";
import type { Jurisdiction, Location, Region, SubJurisdiction } from "./model.js";

export type { Location };

export interface LocationFilters {
  regions?: number[];
  subJurisdictions?: number[];
}

export async function getAllLocations(language: "en" | "cy", filters?: LocationFilters): Promise<Location[]> {
  const sortField = language === "cy" ? "welshName" : "name";

  const locations = await prisma.location.findMany({
    where: {
      deletedAt: null,
      ...(filters?.regions &&
        filters.regions.length > 0 && {
          locationRegions: {
            some: {
              regionId: {
                in: filters.regions
              }
            }
          }
        }),
      ...(filters?.subJurisdictions &&
        filters.subJurisdictions.length > 0 && {
          locationSubJurisdictions: {
            some: {
              subJurisdictionId: {
                in: filters.subJurisdictions
              }
            }
          }
        })
    },
    orderBy: {
      [sortField]: "asc"
    },
    select: {
      locationId: true,
      name: true,
      welshName: true,
      locationRegions: {
        select: {
          region: {
            select: {
              regionId: true
            }
          }
        }
      },
      locationSubJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              subJurisdictionId: true
            }
          }
        }
      }
    }
  });

  return locations.map((loc) => ({
    locationId: loc.locationId,
    name: loc.name,
    welshName: loc.welshName,
    regions: loc.locationRegions.map((lr) => lr.region.regionId),
    subJurisdictions: loc.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.subJurisdictionId)
  }));
}

export async function searchLocationsByName(query: string, language: "en" | "cy"): Promise<Location[]> {
  const sortField = language === "cy" ? "welshName" : "name";
  const searchField = language === "cy" ? "welshName" : "name";

  const locations = await prisma.location.findMany({
    where: {
      deletedAt: null,
      [searchField]: {
        contains: query,
        mode: "insensitive"
      }
    },
    orderBy: {
      [sortField]: "asc"
    },
    select: {
      locationId: true,
      name: true,
      welshName: true,
      locationRegions: {
        select: {
          region: {
            select: {
              regionId: true
            }
          }
        }
      },
      locationSubJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              subJurisdictionId: true
            }
          }
        }
      }
    }
  });

  return locations.map((loc) => ({
    locationId: loc.locationId,
    name: loc.name,
    welshName: loc.welshName,
    regions: loc.locationRegions.map((lr) => lr.region.regionId),
    subJurisdictions: loc.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.subJurisdictionId)
  }));
}

export async function getLocationById(id: number): Promise<Location | undefined> {
  const location = await prisma.location.findFirst({
    where: {
      locationId: id,
      deletedAt: null
    },
    select: {
      locationId: true,
      name: true,
      welshName: true,
      locationRegions: {
        select: {
          region: {
            select: {
              regionId: true
            }
          }
        }
      },
      locationSubJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              subJurisdictionId: true
            }
          }
        }
      }
    }
  });

  if (!location) {
    return undefined;
  }

  return {
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName,
    regions: location.locationRegions.map((lr) => lr.region.regionId),
    subJurisdictions: location.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.subJurisdictionId)
  };
}

export async function getLocationsByIds(ids: number[]): Promise<Location[]> {
  const locations = await prisma.location.findMany({
    where: {
      locationId: {
        in: ids
      },
      deletedAt: null
    },
    select: {
      locationId: true,
      name: true,
      welshName: true,
      locationRegions: {
        select: {
          region: {
            select: {
              regionId: true
            }
          }
        }
      },
      locationSubJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              subJurisdictionId: true
            }
          }
        }
      }
    }
  });

  return locations.map((location) => ({
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName,
    regions: location.locationRegions.map((lr) => lr.region.regionId),
    subJurisdictions: location.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.subJurisdictionId)
  }));
}

export async function getAllJurisdictions(): Promise<Jurisdiction[]> {
  return prisma.jurisdiction.findMany({
    orderBy: { jurisdictionId: "asc" },
    select: {
      jurisdictionId: true,
      name: true,
      welshName: true
    }
  });
}

export async function getAllRegions(): Promise<Region[]> {
  return prisma.region.findMany({
    orderBy: { regionId: "asc" },
    select: {
      regionId: true,
      name: true,
      welshName: true
    }
  });
}

export async function getAllSubJurisdictions(): Promise<SubJurisdiction[]> {
  return prisma.subJurisdiction.findMany({
    orderBy: { subJurisdictionId: "asc" },
    select: {
      subJurisdictionId: true,
      name: true,
      welshName: true,
      jurisdictionId: true
    }
  });
}

export async function getSubJurisdictionsByJurisdiction(jurisdictionId: number): Promise<SubJurisdiction[]> {
  return prisma.subJurisdiction.findMany({
    where: { jurisdictionId },
    orderBy: { subJurisdictionId: "asc" },
    select: {
      subJurisdictionId: true,
      name: true,
      welshName: true,
      jurisdictionId: true
    }
  });
}

export async function getLocationWithDetails(locationId: number): Promise<import("./model.js").LocationDetails | null> {
  const location = await prisma.location.findFirst({
    where: {
      locationId,
      deletedAt: null
    },
    select: {
      locationId: true,
      name: true,
      welshName: true,
      locationRegions: {
        select: {
          region: {
            select: {
              name: true,
              welshName: true
            }
          }
        }
      },
      locationSubJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              name: true,
              welshName: true,
              jurisdiction: {
                select: {
                  name: true,
                  welshName: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!location) {
    return null;
  }

  return {
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName,
    regions: location.locationRegions.map((lr) => ({
      name: lr.region.name,
      welshName: lr.region.welshName
    })),
    subJurisdictions: location.locationSubJurisdictions.map((lsj) => ({
      name: lsj.subJurisdiction.name,
      welshName: lsj.subJurisdiction.welshName,
      jurisdictionName: lsj.subJurisdiction.jurisdiction.name,
      jurisdictionWelshName: lsj.subJurisdiction.jurisdiction.welshName
    }))
  };
}

export async function hasActiveSubscriptions(locationId: number): Promise<boolean> {
  const count = await prisma.subscription.count({
    where: {
      searchType: "LOCATION_ID",
      searchValue: locationId.toString()
    }
  });

  return count > 0;
}

export async function hasActiveArtefacts(locationId: number): Promise<boolean> {
  const count = await prisma.artefact.count({
    where: {
      locationId: locationId.toString(),
      displayTo: {
        gt: new Date()
      }
    }
  });

  return count > 0;
}

export async function softDeleteLocation(locationId: number): Promise<void> {
  await prisma.location.update({
    where: {
      locationId
    },
    data: {
      deletedAt: new Date()
    }
  });
}
