export interface Publication {
  id: number;
  locationId: number;
  listType: number;
  contentDate: string;
  language: "ENGLISH" | "WELSH";
}

export const mockPublications: Publication[] = [
  {
    id: 1,
    locationId: 9,
    listType: 4,
    contentDate: "2025-04-20",
    language: "ENGLISH"
  },
  {
    id: 2,
    locationId: 9,
    listType: 4,
    contentDate: "2025-04-18",
    language: "ENGLISH"
  },
  {
    id: 3,
    locationId: 9,
    listType: 3,
    contentDate: "2025-04-15",
    language: "ENGLISH"
  },
  {
    id: 4,
    locationId: 9,
    listType: 4,
    contentDate: "2025-04-12",
    language: "ENGLISH"
  },
  {
    id: 5,
    locationId: 9,
    listType: 3,
    contentDate: "2025-04-10",
    language: "ENGLISH"
  },
  {
    id: 6,
    locationId: 9,
    listType: 4,
    contentDate: "2025-03-28",
    language: "ENGLISH"
  },
  {
    id: 7,
    locationId: 9,
    listType: 3,
    contentDate: "2025-03-25",
    language: "ENGLISH"
  },
  {
    id: 8,
    locationId: 9,
    listType: 4,
    contentDate: "2025-03-20",
    language: "ENGLISH"
  },
  {
    id: 9,
    locationId: 9,
    listType: 3,
    contentDate: "2025-02-28",
    language: "WELSH"
  },
  {
    id: 10,
    locationId: 9,
    listType: 4,
    contentDate: "2025-02-25",
    language: "ENGLISH"
  },
  {
    id: 11,
    locationId: 1,
    listType: 1,
    contentDate: "2025-04-18",
    language: "ENGLISH"
  },
  {
    id: 12,
    locationId: 1,
    listType: 2,
    contentDate: "2025-04-15",
    language: "ENGLISH"
  },
  {
    id: 13,
    locationId: 1,
    listType: 5,
    contentDate: "2025-04-10",
    language: "WELSH"
  }
];
