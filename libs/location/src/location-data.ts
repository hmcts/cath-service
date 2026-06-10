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
    },
    {
      locationId: 11,
      name: "Birmingham Crown Court",
      welshName: "Llys y Goron Birmingham",
      regions: [2],
      subJurisdictions: [4]
    },
    {
      locationId: 12,
      name: "Birmingham Magistrates' Court",
      welshName: "Llys Ynadon Birmingham",
      regions: [2],
      subJurisdictions: [7]
    },
    {
      locationId: 13,
      name: "Midlands Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Canolbarth Lloegr",
      regions: [2],
      subJurisdictions: [8]
    },
    {
      locationId: 14,
      name: "South East Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant De Ddwyrain",
      regions: [3],
      subJurisdictions: [8]
    },
    {
      locationId: 15,
      name: "Wales and South West Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Cymru a De Orllewin Lloegr",
      regions: [5, 7],
      subJurisdictions: [8]
    },
    {
      locationId: 16,
      name: "Scotland Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Yr Alban",
      regions: [8],
      subJurisdictions: [8]
    },
    {
      locationId: 17,
      name: "North East Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Ddwyrain Lloegr",
      regions: [9],
      subJurisdictions: [8]
    },
    {
      locationId: 18,
      name: "North West Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Orllewin Lloegr",
      regions: [10],
      subJurisdictions: [8]
    },
    {
      locationId: 19,
      name: "London Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain",
      regions: [1],
      subJurisdictions: [8]
    },
    {
      locationId: 20,
      name: "Liverpool Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Lerpwl",
      regions: [10],
      subJurisdictions: [8]
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
    },
    {
      regionId: 7,
      name: "South West",
      welshName: "De Orllewin Lloegr"
    },
    {
      regionId: 8,
      name: "Scotland",
      welshName: "Yr Alban"
    },
    {
      regionId: 9,
      name: "North East",
      welshName: "Gogledd Ddwyrain Lloegr"
    },
    {
      regionId: 10,
      name: "North West",
      welshName: "Gogledd Orllewin Lloegr"
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
      jurisdictionId: 3
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
    },
    {
      subJurisdictionId: 9,
      name: "Care Standards Tribunal",
      welshName: "Tribiwnlys Safonau Gofal",
      jurisdictionId: 4
    }
  ]
};
