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
      regions: [6],
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
      regions: [9],
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
      name: "First-tier Tribunal (Special Educational Needs and Disability)",
      welshName: "Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
      regions: [8],
      subJurisdictions: [18]
    },
    {
      locationId: 14,
      name: "Criminal Injuries Compensation Tribunal",
      welshName: "Tribiwnlys Iawndal am Anafiadau Troseddol",
      regions: [8],
      subJurisdictions: [14]
    },
    {
      locationId: 15,
      name: "East London Tribunal Service",
      welshName: "Gwasanaeth Tribiwnlys Dwyrain Llundain",
      regions: [1],
      subJurisdictions: [13]
    },
    {
      locationId: 16,
      name: "Asylum Support Tribunal",
      welshName: "Tribiwnlys Cefnogi Ceiswyr Lloches",
      regions: [1],
      subJurisdictions: [13],
      provenanceLocationType: "NATIONAL"
    },
    {
      locationId: 17,
      name: "Midlands Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Canolbarth Lloegr",
      regions: [2],
      subJurisdictions: [8]
    },
    {
      locationId: 18,
      name: "South East Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant De Ddwyrain",
      regions: [3],
      subJurisdictions: [8]
    },
    {
      locationId: 19,
      name: "Wales and South West Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Cymru a De Orllewin Lloegr",
      regions: [5, 13],
      subJurisdictions: [8]
    },
    {
      locationId: 20,
      name: "Scotland Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Yr Alban",
      regions: [12],
      subJurisdictions: [8]
    },
    {
      locationId: 21,
      name: "North East Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Ddwyrain Lloegr",
      regions: [9],
      subJurisdictions: [8]
    },
    {
      locationId: 22,
      name: "North West Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Orllewin Lloegr",
      regions: [4],
      subJurisdictions: [8]
    },
    {
      locationId: 23,
      name: "London Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain",
      regions: [1],
      subJurisdictions: [8]
    },
    {
      locationId: 24,
      name: "Liverpool Social Security and Child Support Tribunal",
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Lerpwl",
      regions: [4],
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
      welshName: "De-ddwyrain Lloegr"
    },
    {
      regionId: 4,
      name: "North West",
      welshName: "Gogledd Orllewin Lloegr"
    },
    {
      regionId: 5,
      name: "Wales",
      welshName: "Cymru"
    },
    {
      regionId: 6,
      name: "Yorkshire",
      welshName: "Swydd Efrog Lloegr"
    },
    {
      regionId: 7,
      name: "East of England",
      welshName: "Dwyrain Lloegr"
    },
    {
      regionId: 8,
      name: "National",
      welshName: "Cenedlaethol"
    },
    {
      regionId: 9,
      name: "North East",
      welshName: "Gogledd-ddwyrain Lloegr"
    },
    {
      regionId: 10,
      name: "Northern Ireland",
      welshName: "Gogledd Iwerddon"
    },
    {
      regionId: 11,
      name: "Royal Courts of Justice Group",
      welshName: "Grŵp y Llysoedd Barn Brenhinol"
    },
    {
      regionId: 12,
      name: "Scotland",
      welshName: "Yr Alban"
    },
    {
      regionId: 13,
      name: "South West",
      welshName: "De-orllewin Lloegr"
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
      welshName: "Troseddau"
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
      name: "Court of Appeal (Civil Division)",
      welshName: "Y Llys Apêl (Adran Sifil)",
      jurisdictionId: 1
    },
    {
      subJurisdictionId: 6,
      name: "Immigration and Asylum Chamber",
      welshName: "Siambr Mewnfudo a Lloches",
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
      welshName: "Tribiwnlys Nawdd Cymdeithasol a Chynnal Plant",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 9,
      name: "Care Standards Tribunal",
      welshName: "Tribiwnlys Safonau Gofal",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 10,
      name: "High Court",
      welshName: "Yr Uchel Lys",
      jurisdictionId: 1
    },
    {
      subJurisdictionId: 11,
      name: "High Court of the Family Division",
      welshName: "Adran Deulu yr Uchel Lys",
      jurisdictionId: 2
    },
    {
      subJurisdictionId: 12,
      name: "Court of Appeal (Criminal Division)",
      welshName: "Y Llys Apêl (Adran Troseddol)",
      jurisdictionId: 3
    },
    {
      subJurisdictionId: 13,
      name: "Asylum Support Tribunal",
      welshName: "Tribiwnlys Cefnogi Ceiswyr Lloches",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 14,
      name: "Criminal Injuries Compensation Tribunal",
      welshName: "Tribiwnlys Digolledu am Anafiadau Troseddol",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 15,
      name: "First-Tier Tribunal (Land Registration Tribunal)",
      welshName: "Tribiwnlys Haen Gyntaf (Tribiwnlys Cofrestru Tir)",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 16,
      name: "First-Tier Tribunal (Tax Chamber)",
      welshName: "Tribiwnlys Haen Gyntaf (Siambr Treth)",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 17,
      name: "First-Tier Tribunal (War Pensions and Armed Forces Compensation)",
      welshName: "Tribiwnlys Haen Gyntaf (Iawndal Pensiynau Rhyfel a'r Lluoedd Arfog)",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 18,
      name: "First-tier Tribunal (Special Educational Needs and Disability)",
      welshName: "Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 19,
      name: "General Regulatory Chamber",
      welshName: "Siambr Rheoleiddio Cyffredinol",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 20,
      name: "Mental Health Tribunal",
      welshName: "Tribiwnlys Iechyd Meddwl",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 21,
      name: "Pathogens Access Appeal Commission",
      welshName: "Comisiwn Apeliadau Mynediad Pathogenau",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 22,
      name: "Primary Health Tribunal",
      welshName: "Tribiwnlys Iechyd Sylfaenol",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 23,
      name: "Proscribed Organisations Appeal Commission",
      welshName: "Comisiwn Apeliadau Sefydliadau Gwaharddedig",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 24,
      name: "Residential Property Tribunal",
      welshName: "Tribiwnlys Eiddo Preswyl",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 25,
      name: "Special Immigration Appeals Commission",
      welshName: "Comisiwn Apeliadau Mewnfudo Arbennig",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 26,
      name: "Upper Tribunal (Administrative Appeals Chamber)",
      welshName: "Uwch Dribiwnlys (Siambr Apeliadau Gweinyddol)",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 27,
      name: "Upper Tribunal (Immigration and Asylum) - Judicial Review",
      welshName: "Siambr Uwch Dribiwnlys (Mewnfudo a Lloches) - Adolygiadau Barnwrol",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 28,
      name: "Upper Tribunal (Immigration and Asylum) - Statutory Appeal",
      welshName: "Siambr Uwch Dribiwnlys (Mewnfudo a Lloches) - Apeliadau Statudol",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 29,
      name: "Upper Tribunal (Lands Chamber)",
      welshName: "Uwch Dribiwnlys (Siambr Tiroedd)",
      jurisdictionId: 4
    },
    {
      subJurisdictionId: 30,
      name: "Upper Tribunal (Tax and Chancery Chamber)",
      welshName: "Uwch Dribiwnlys (Siambr Treth a Siawnsri)",
      jurisdictionId: 4
    }
  ]
};
