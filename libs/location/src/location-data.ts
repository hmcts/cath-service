import type { Jurisdiction, Location, Region, SubJurisdiction } from "./repository/model.js";

export const locationData: {
  locations: Location[];
  regions: Region[];
  jurisdictions: Jurisdiction[];
  subJurisdictions: SubJurisdiction[];
} = {
  locations: [
    {
      locationId: 1,
      name: "Oxford Combined Court Centre",
      welshName: "Canolfan Llysoedd Cyfun Rhydychen",
      regions: [3],
      subJurisdictions: [1, 4]
    },
    {
      locationId: 2,
      name: "Birmingham Civil and Family Justice Centre",
      welshName: "Canolfan Cyfiawnder Sifil a Theulu Birmingham",
      regions: [2],
      subJurisdictions: [1, 2]
    },
    {
      locationId: 3,
      name: "Manchester Civil Justice Centre",
      welshName: "Canolfan Cyfiawnder Sifil Manceinion",
      regions: [4],
      subJurisdictions: [1]
    },
    {
      locationId: 4,
      name: "Royal Courts of Justice",
      welshName: "Llysoedd Barn Brenhinol",
      regions: [1],
      subJurisdictions: [1, 4, 5]
    },
    {
      locationId: 5,
      name: "Cardiff Civil and Family Justice Centre",
      welshName: "Canolfan Cyfiawnder Sifil a Theulu Caerdydd",
      regions: [5],
      subJurisdictions: [1, 2]
    },
    {
      locationId: 6,
      name: "Leeds Combined Court Centre",
      welshName: "Canolfan Llysoedd Cyfun Leeds",
      regions: [4],
      subJurisdictions: [1, 4]
    },
    {
      locationId: 7,
      name: "Bristol Civil and Family Justice Centre",
      welshName: "Canolfan Cyfiawnder Sifil a Theulu Bryste",
      regions: [3],
      subJurisdictions: [1, 2]
    },
    {
      locationId: 8,
      name: "Liverpool Civil and Family Court",
      welshName: "Llys Sifil a Theulu Lerpwl",
      regions: [4],
      subJurisdictions: [1, 2]
    },
    {
      locationId: 9,
      name: "Single Justice Procedure",
      welshName: "Gweithdrefn Un Ynad",
      regions: [1, 2, 3, 4, 5],
      subJurisdictions: [7]
    },
    {
      locationId: 10,
      name: "Newcastle Combined Court Centre",
      welshName: "Canolfan Llysoedd Cyfun Newcastle",
      regions: [4],
      subJurisdictions: [1, 4]
    }
  ],
  regions: [
    {
      regionId: 1,
      name: "London",
      welshName: "Llundain"
    },
    {
      regionId: 2,
      name: "Midlands",
      welshName: "Canolbarth Lloegr"
    },
    {
      regionId: 3,
      name: "South East",
      welshName: "De Ddwyrain"
    },
    {
      regionId: 4,
      name: "North",
      welshName: "Gogledd"
    },
    {
      regionId: 5,
      name: "Wales",
      welshName: "Cymru"
    },
    {
      regionId: 6,
      name: "Yorkshire",
      welshName: "Swydd Efrog"
    }
  ],
  jurisdictions: [
    {
      jurisdictionId: 1,
      name: "Civil",
      welshName: "Sifil"
    },
    {
      jurisdictionId: 2,
      name: "Family",
      welshName: "Teulu"
    },
    {
      jurisdictionId: 3,
      name: "Crime",
      welshName: "Trosedd"
    },
    {
      jurisdictionId: 4,
      name: "Tribunal",
      welshName: "Tribiwnlys"
    }
  ],
  subJurisdictions: [
    {
      subJurisdictionId: 1,
      name: "Civil Court",
      welshName: "Llys Sifil",
      jurisdictionId: 1
    },
    {
      subJurisdictionId: 2,
      name: "Family Court",
      welshName: "Llys Teulu",
      jurisdictionId: 2
    },
    {
      subJurisdictionId: 3,
      name: "Employment Tribunal",
      welshName: "Tribiwnlys Cyflogaeth",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 4,
      name: "Crown Court",
      welshName: "Llys y Goron",
      jurisdictionId: 1
    },
    {
      subJurisdictionId: 5,
      name: "Court of Appeal",
      welshName: "Llys Apêl",
      jurisdictionId: 1
    },
    {
      subJurisdictionId: 6,
      name: "Immigration and Asylum Tribunal",
      welshName: "Tribiwnlys Mewnfudo a Lloches",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 7,
      name: "Magistrates Court",
      welshName: "Llys Ynadon",
      jurisdictionId: 3
    },
    {
      subJurisdictionId: 8,
      name: "Social Security and Child Support",
      welshName: "Nawdd Cymdeithasol a Chynhaliaeth Plant",
      jurisdictionId: 4
    }
  ]
};
